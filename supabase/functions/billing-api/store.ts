import { ApiError, assertExpected, billNumber, day, reminders, same, today, transaction, validateCustomer, validateTransaction, text, type Row } from "./domain.ts";

export interface Connection {
  query(sql: string, params?: unknown[]): Promise<Row[]>;
}
export interface Database extends Connection {
  begin<T>(callback: (connection: Connection) => Promise<T>, readOnly?: boolean): Promise<T>;
}

// All mutations use the same transaction-scoped lock. This protects bill-number
// uniqueness across different record IDs without altering the legacy schema.
// The old backend MUST stop writing before production cutover.
async function write<T>(db: Database, fn: (c: Connection) => Promise<T>): Promise<T> {
  return await db.begin(async c => {
    await c.query("SET LOCAL lock_timeout = '5s'");
    await c.query("SET LOCAL statement_timeout = '10s'");
    await c.query("SELECT pg_advisory_xact_lock(73498761)");
    return await fn(c);
  });
}

async function getTxn(c: Connection, id: string): Promise<Row | undefined> {
  return (await c.query('SELECT * FROM public.transactions WHERE id = $1 FOR UPDATE', [id]))[0];
}

async function saveCustomer(c: Connection, input: Row, expected: unknown): Promise<Row> {
  const customer = validateCustomer(input);
  const existing = (await c.query('SELECT * FROM public.customers WHERE id = $1 FOR UPDATE', [customer.id]))[0];
  if (existing) {
    if (same(existing,customer)) return existing;
    assertExpected(existing, expected);
  }
  else if (expected != null) throw new ApiError(409, "Customer was deleted. Refresh before saving.");
  return (await c.query(`INSERT INTO public.customers (id,name,phone,address,father,idproof,mandal)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET
    name=EXCLUDED.name,phone=EXCLUDED.phone,address=EXCLUDED.address,father=EXCLUDED.father,
    idproof=EXCLUDED.idproof,mandal=EXCLUDED.mandal RETURNING *`,
    [customer.id, customer.name, customer.phone, customer.address, customer.father, customer.idproof, customer.mandal]))[0];
}

export async function saveRecord(db: Database, body: Row): Promise<Row> {
  const t = validateTransaction(body.transaction);
  const customer = body.customer == null ? null : validateCustomer(body.customer);
  if (customer && customer.id !== t.customerId) throw new ApiError(400, "Customer does not match transaction.");
  return await write(db, async c => {
    const existing = await getTxn(c, t.id);
    if (existing) {
      if (t.createOnly) throw new ApiError(409, "This record already exists. No existing loan was overwritten.");
      if (!t.updateOnly) throw new ApiError(409, "Existing records require updateOnly and an edit snapshot.");
      if (t.type !== existing.type) throw new ApiError(409, "Transaction type cannot be changed.");
      assertExpected(transaction(existing), t.expectedTransaction);
    } else {
      if (t.updateOnly) throw new ApiError(409, "This record was deleted. No loan was recreated.");
      if (!t.createOnly) throw new ApiError(400, "New records require createOnly.");
    }
    if (customer) await saveCustomer(c, customer, body.expectedCustomer ?? body.customer?.expectedCustomer);
    else if (!(await c.query('SELECT id FROM public.customers WHERE id = $1', [t.customerId])).length) {
      throw new ApiError(409, "Customer does not exist. Save the customer with the loan.");
    }
    const details = t.type === "loan" ? t.loanDetails : t.items;
    const json = JSON.stringify(details);
    const candidate = { id: t.id, type: t.type, itemsJson: json };
    if (t.type === "loan" && (!existing || billNumber(existing) !== billNumber(candidate) || existing.date.slice(0,4) !== t.date.slice(0,4))) {
      const other = await c.query(`SELECT id,type,"itemsJson" FROM public.transactions
        WHERE type='loan' AND id<>$1 AND left(date,4)=$2`, [t.id, t.date.slice(0,4)]);
      if (other.some(row => billNumber(row) === billNumber(candidate))) {
        throw new ApiError(409, "This bill number belongs to another loan in the same year.");
      }
    }
    const status = t.status ?? existing?.status ?? (t.type === "loan" ? "Pending" : "Cleared");
    const cleared = t.clearedDate === undefined ? existing?.clearedDate ?? null : t.clearedDate;
    const result = (await c.query(`INSERT INTO public.transactions
      (id,"customerId",type,amount,category,date,"itemsJson",status,"clearedDate")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET "customerId"=EXCLUDED."customerId",amount=EXCLUDED.amount,
      category=EXCLUDED.category,date=EXCLUDED.date,"itemsJson"=EXCLUDED."itemsJson",
      status=EXCLUDED.status,"clearedDate"=EXCLUDED."clearedDate" RETURNING *`,
      [t.id,t.customerId,t.type,t.amount,t.category ?? existing?.category ?? "Jewelry",t.date,json,status,cleared]))[0];
    return { transaction: transaction(result), customer };
  }); // begin resolves only after COMMIT; HTTP success is sent afterwards.
}

export async function putCustomer(db: Database, body: Row): Promise<Row> {
  return await write(db, c => saveCustomer(c, body, body.expectedCustomer));
}

export async function deleteTransaction(db: Database, id: string, expected: unknown): Promise<Row> {
  return await write(db, async c => {
    const row = await getTxn(c, id);
    if (!row) throw new ApiError(404, "Transaction not found.");
    assertExpected(transaction(row), expected);
    await c.query('DELETE FROM public.transactions WHERE id=$1', [id]);
    return { status: "success" };
  });
}

export async function deleteCustomer(db: Database, id: string, expected: unknown): Promise<Row> {
  return await write(db, async c => {
    const row = (await c.query('SELECT * FROM public.customers WHERE id=$1 FOR UPDATE', [id]))[0];
    if (!row) throw new ApiError(404, "Customer not found.");
    assertExpected(row, expected);
    if ((await c.query('SELECT id FROM public.transactions WHERE "customerId"=$1 LIMIT 1', [id])).length) {
      throw new ApiError(409, "This customer has bills. Deleting it would orphan their records.");
    }
    await c.query('DELETE FROM public.customers WHERE id=$1', [id]);
    return { status: "success" };
  });
}

export async function clearTransaction(db: Database, body: Row): Promise<Row> {
  const id = text(body.txnId, "Transaction ID", 200);
  const date = day(body.clearedDate || today(), "Cleared date");
  return await write(db, async c => {
    const row = await getTxn(c, id);
    if (!row) throw new ApiError(404, "Transaction not found.");
    assertExpected(transaction(row), body.expectedTransaction);
    const details = JSON.parse(row.itemsJson);
    if (details && typeof details === "object" && !Array.isArray(details)) details.clearedDate = date;
    const saved = (await c.query(`UPDATE public.transactions SET status='Cleared',"clearedDate"=$2,"itemsJson"=$3
      WHERE id=$1 RETURNING *`, [id,date,JSON.stringify(details)]))[0];
    return transaction(saved);
  });
}

export async function dashboard(db: Database): Promise<Row> {
  // One consistent snapshot prevents totals and customer/loan lists from disagreeing.
  return await db.begin(async c => {
    const customers = await c.query('SELECT * FROM public.customers');
    const transactions = (await c.query('SELECT * FROM public.transactions')).map(transaction);
    const templates = await c.query('SELECT * FROM public.sms_templates');
    const queue = await c.query('SELECT * FROM public.sms_queue');
    const devices = await c.query('SELECT * FROM public.devices');
    const catalog = await c.query('SELECT * FROM public.item_catalog');
    return { customers, transactions, smsTemplates: templates, smsQueue: queue.map(queueView),
      smsDevices: devices.map(deviceView), itemsCatalog: catalog,
      remindersStatus: reminders(transactions,customers,queue,true) };
  }, true);
}

export function queueView(s: Row): Row {
  return { id:s.uuid, customer_id:s.customerId, phone:s.phone,message:s.message,status:s.status,
    retry_count:s.retryCount,created_time:s.createdAt };
}

export async function smsDispatchControl(db: Database): Promise<Row> {
  const row=(await db.query('SELECT paused,updated_at,updated_by_email FROM public.sms_dispatch_control WHERE singleton=true'))[0];
  if (!row) throw new ApiError(503,"SMS delivery control is not configured.");
  return {paused:row.paused,updatedAt:row.updated_at,updatedBy:row.updated_by_email};
}

export async function setSMSDispatchPaused(db: Database, paused: boolean, email: string): Promise<Row> {
  return await write(db,async c=> {
    const row=(await c.query(`UPDATE public.sms_dispatch_control SET paused=$1,updated_at=now(),
      updated_by=nullif(current_setting('billing.actor',true),'')::uuid,updated_by_email=$2
      WHERE singleton=true RETURNING paused,updated_at,updated_by_email`,[paused,email]))[0];
    if (!row) throw new ApiError(503,"SMS delivery control is not configured.");
    const actor=await c.query("SELECT nullif(current_setting('billing.actor',true),'') AS id");
    await c.query(`INSERT INTO public.billing_access_events(actor,actor_email,event) VALUES ($1,$2,$3)`,
      [actor[0]?.id,email,paused?'sms_dispatch_paused':'sms_dispatch_resumed']);
    return {paused:row.paused,updatedAt:row.updated_at,updatedBy:row.updated_by_email};
  });
}
export function deviceView(d: Row): Row {
  const lastSeen=Date.parse(d.lastSeen || '');
  const connected=d.connectionStatus==='Connected' && Number.isFinite(lastSeen) && Date.now()-lastSeen<90000;
  return { id:d.deviceUuid,name:d.name,model:d.model,battery:d.battery,sim:d.operator,
    status:connected?'Connected':'Disconnected',connection:connected?'Connected':'Disconnected',last_seen:d.lastSeen };
}

export async function catalogWrite(db: Database, body: Row): Promise<Row> {
  const name = text(body.name,"Item name"), category = text(body.category,"Category",100);
  return await write(db, async c => {
    const row = body.id ? (await c.query('SELECT * FROM public.item_catalog WHERE id=$1',[body.id]))[0]
      : (await c.query('SELECT * FROM public.item_catalog WHERE name=$1 AND category=$2',[name,category]))[0];
    if (row) {
      if (row.name === name && row.category === category) return row;
      assertExpected(row,body.expectedItem);
      return (await c.query('UPDATE public.item_catalog SET name=$2,category=$3 WHERE id=$1 RETURNING *',[row.id,name,category]))[0];
    }
    if (body.id) throw new ApiError(404,"Item not found.");
    return (await c.query('INSERT INTO public.item_catalog (name,category) VALUES ($1,$2) RETURNING *',[name,category]))[0];
  });
}

export async function templateWrite(db: Database, body: Row): Promise<Row> {
  const name = text(body.name,"Template name"), content = text(body.content,"Template content",10000);
  return await write(db,async c => {
    const row = body.id ? (await c.query('SELECT * FROM public.sms_templates WHERE id=$1',[body.id]))[0]
      : (await c.query('SELECT * FROM public.sms_templates WHERE name=$1',[name]))[0];
    if (row) {
      if (row.name === name && row.content === content) return row;
      assertExpected(row,body.expectedTemplate);
      return (await c.query('UPDATE public.sms_templates SET name=$2,content=$3 WHERE id=$1 RETURNING *',[row.id,name,content]))[0];
    }
    if (body.id) throw new ApiError(404,"Template not found.");
    return (await c.query('INSERT INTO public.sms_templates (name,content) VALUES ($1,$2) RETURNING *',[name,content]))[0];
  });
}

export async function deleteAuxiliary(db: Database, kind: "item" | "template", id: unknown, expected: unknown): Promise<Row> {
  return await write(db,async c => {
    const table = kind === "item" ? "item_catalog" : "sms_templates";
    const column = kind === "item" ? "id" : "name";
    const row = (await c.query(`SELECT * FROM public.${table} WHERE ${column}=$1`,[id]))[0];
    if (!row) throw new ApiError(404,"Record not found.");
    assertExpected(row,expected);
    await c.query(`DELETE FROM public.${table} WHERE ${column}=$1`,[id]);
    return { status:"success" };
  });
}

export async function queueSMS(db: Database, body: Row): Promise<Row> {
  const id = text(body.id,"SMS ID",200), phone = text(body.phone,"Phone",40), message = text(body.message,"SMS message",10000);
  return await write(db,async c => {
    const existing = (await c.query('SELECT * FROM public.sms_queue WHERE uuid=$1',[id]))[0];
    if (existing) {
      if (existing.phone !== phone || existing.message !== message) throw new ApiError(409,"SMS ID already exists with a different message.");
      return { status:"success",sms_id:id }; // Retry cannot reset Sent to Pending.
    }
    await c.query(`INSERT INTO public.sms_queue
      (uuid,"customerId",phone,message,status,"retryCount","createdAt",priority)
      VALUES ($1,$2,$3,$4,'Pending',0,$5,1)`,[id,body.customerId ?? null,phone,message,new Date().toISOString()]);
    return { status:"success",sms_id:id };
  });
}

export async function changeSMS(db: Database, body: Row, cancel: boolean): Promise<Row> {
  return await write(db,async c => {
    const id = text(body.smsId,"SMS ID",200);
    const row = (await c.query('SELECT * FROM public.sms_queue WHERE uuid=$1 FOR UPDATE',[id]))[0];
    if (!row) throw new ApiError(404,"SMS not found.");
    if (!['Pending','Queued','Failed'].includes(row.status)) throw new ApiError(409,"A sent or in-flight SMS cannot be retried or cancelled here.");
    await c.query('UPDATE public.sms_queue SET status=$2,"retryCount"="retryCount"+$3 WHERE uuid=$1',[id,cancel?'Cancelled':'Pending',cancel?0:1]);
    return { status:"success" };
  });
}

export async function pairDevice(db: Database, body: Row, tokenHash: string): Promise<Row> {
  const id=text(body.id,"Device UUID",200),name=text(body.name,"Device name",200);
  return await write(db,async c=> {
    await c.query(`INSERT INTO public.devices ("deviceUuid",name,"connectionStatus","isOnline")
      VALUES ($1,$2,'Disconnected',false) ON CONFLICT ("deviceUuid") DO UPDATE SET name=EXCLUDED.name`,[id,name]);
    await c.query(`INSERT INTO public.billing_bridge_keys (device_id,token_hash,enabled)
      VALUES ($1,$2,true) ON CONFLICT(device_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,enabled=true`,[id,tokenHash]);
    return {status:"success",deviceId:id};
  });
}

export async function revokeDevice(db: Database, id: string): Promise<Row> {
  return await write(db,async c=> {
    await c.query('UPDATE public.billing_bridge_keys SET enabled=false WHERE device_id=$1',[id]);
    await c.query(`UPDATE public.devices SET "connectionStatus"='Disconnected',"isOnline"=false WHERE "deviceUuid"=$1`,[id]);
    return {status:"success"};
  });
}

export async function bridgeRequest(db: Database, deviceId: string, action: string, body: Row): Promise<Row> {
  return await write(db,async c=> {
    // Recheck revocation inside the write lock, including requests authenticated before key rotation.
    const key=(await c.query('SELECT * FROM public.billing_bridge_keys WHERE device_id=$1 AND enabled=true',[deviceId]))[0];
    if (!key || key.token_hash!==body.authenticatedTokenHash) throw new ApiError(401,"Device pairing expired.");
    if (action === "heartbeat" || action === "claim") {
      const battery=Number(body.battery ?? 100);
      if (!Number.isInteger(battery) || battery<0 || battery>100) throw new ApiError(400,"Invalid device battery.");
      await c.query(`UPDATE public.devices SET "connectionStatus"='Connected',"isOnline"=true,
        "lastSeen"=$2,battery=$3,operator=$4 WHERE "deviceUuid"=$1`,[deviceId,new Date().toISOString(),battery,String(body.sim ?? "Unknown").slice(0,100)]);
      if (action === "heartbeat") return {status:"success"};
      const dispatch=(await c.query('SELECT paused FROM public.sms_dispatch_control WHERE singleton=true'))[0];
      if (dispatch?.paused) return {job:null,paused:true};
      const job=(await c.query(`SELECT * FROM public.sms_queue WHERE status IN ('Pending','Queued')
        ORDER BY priority DESC NULLS LAST,"createdAt",uuid LIMIT 1 FOR UPDATE SKIP LOCKED`))[0];
      if (!job) return {job:null};
      await c.query(`UPDATE public.sms_queue SET status='Sending',"bridgeDeviceId"=$2 WHERE uuid=$1`,[job.uuid,deviceId]);
      return {job:{smsId:job.uuid,phone:job.phone,message:job.message}};
    }
    if (action === "result") {
      const id=text(body.smsId,"SMS ID",200);
      if (!['Submitted','Failed'].includes(body.status)) throw new ApiError(400,"Invalid SMS result.");
      const row=(await c.query('SELECT * FROM public.sms_queue WHERE uuid=$1 FOR UPDATE',[id]))[0];
      if (!row || row.bridgeDeviceId!==deviceId) throw new ApiError(403,"SMS was not assigned to this device.");
      if (row.status === body.status) return {status:"success"}; // Lost acknowledgement is safe to retry.
      if (row.status!=='Sending') throw new ApiError(409,"SMS result conflicts with its current state.");
      await c.query(`UPDATE public.sms_queue SET status=$2,"completedAt"=$3,"errorMessage"=$4 WHERE uuid=$1`,
        [id,body.status,new Date().toISOString(),body.status==='Failed'?String(body.error ?? 'Phone submission failed').slice(0,500):null]);
      return {status:"success"};
    }
    throw new ApiError(404,"Bridge action not found.");
  });
}

export async function triggerReminders(db: Database): Promise<Row> {
  return await write(db,async c=> {
    const loans=(await c.query('SELECT * FROM public.transactions')).map(transaction);
    const customers=await c.query('SELECT * FROM public.customers');
    const queue=await c.query('SELECT * FROM public.sms_queue');
    const templates=await c.query('SELECT * FROM public.sms_templates');
    const due=reminders(loans,customers,queue);
    let count=0;
    for (const r of due) {
      if (![7,30].includes(r.daysLeft) || !r.phone || (r.daysLeft===7?r.sent7Day:r.sent30Day)) continue;
      const name=`Loan Warning (${r.daysLeft} Days)`;
      const template=templates.find(t=>t.name===name)?.content;
      if (!template) continue; // Do not overwrite or invent a shop's customized template.
      const message=template.replaceAll('{CustomerName}',r.customerName).replaceAll('{InvoiceNumber}',r.loanId);
      const id=`REMINDER-${r.loanId}-${r.endDate}-${r.daysLeft}`;
      const rows=await c.query(`INSERT INTO public.sms_queue (uuid,"customerId",phone,message,status,"retryCount","createdAt",priority)
        VALUES ($1,$2,$3,$4,'Pending',0,$5,1) ON CONFLICT(uuid) DO NOTHING RETURNING uuid`,[id,r.customerId,r.phone,message,new Date().toISOString()]);
      count+=rows.length;
    }
    return {status:"success",count};
  });
}
