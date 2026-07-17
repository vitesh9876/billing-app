import json
import logging
import os
import datetime
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.db.session import engine, Base, get_db
from backend.app.models.models import Customer, Transaction
from backend.app.repository.repository import (
    CustomerRepository,
    TransactionRepository,
    SMSQueueRepository,
    DeviceRepository,
    SMSTemplateRepository,
    ItemCatalogRepository
)

# Setup directories
os.makedirs("backend/logs", exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SmartShopAPI")
file_handler = logging.FileHandler("backend/logs/server.log")
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

def scan_and_queue_reminders_sync(db):
    from backend.app.models.models import SMSQueue, Customer, Transaction, SMSTemplate
    from backend.app.repository.repository import DeviceRepository, SMSQueueRepository
    import datetime
    import json
    
    today = datetime.date.today()
    loans = db.query(Transaction).filter(Transaction.type == "loan", Transaction.status != "Cleared").all()
    generated_count = 0

    for l in loans:
        try:
            details = json.loads(l.itemsJson) if l.itemsJson else {}
        except Exception:
            details = {}
            
        taken_date_str = details.get("takenDate", l.date)
        end_date_str = details.get("endDate")
        
        if not end_date_str:
            taken_dt = datetime.datetime.strptime(taken_date_str, "%Y-%m-%d").date()
            if l.category == "Silver":
                end_dt = taken_dt + datetime.timedelta(days=90)
            else:
                end_dt = taken_dt + datetime.timedelta(days=365)
            end_date_str = end_dt.strftime("%Y-%m-%d")
            
        end_dt = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
        days_left = (end_dt - today).days
        
        if days_left in [30, 7]:
            cust = db.query(Customer).filter(Customer.id == l.customerId).first()
            if not cust:
                continue
                
            label = f"ఇంకా {days_left} రోజులు"
            already_sent = db.query(SMSQueue).filter(
                SMSQueue.phone == cust.phone,
                SMSQueue.message.like(f"%{l.id}%"),
                SMSQueue.message.like(f"%{label}%")
            ).first()
            
            if already_sent:
                continue
                
            if days_left == 30:
                tpl = db.query(SMSTemplate).filter(SMSTemplate.name == "Loan Warning (30 Days)").first()
                template_str = tpl.content if tpl else "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 30 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: {InvoiceNumber}). దయచేసి గమనించగలరు."
                message = template_str.replace("{CustomerName}", cust.name).replace("{InvoiceNumber}", str(l.id))
            else:
                tpl = db.query(SMSTemplate).filter(SMSTemplate.name == "Loan Warning (7 Days)").first()
                template_str = tpl.content if tpl else "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 7 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: {InvoiceNumber}). త్వరగా చెల్లించవలసిందిగా కోరుతున్నాము, లేనిచో అదనపు వడ్డీ వసూలు చేయబడుతుంది."
                message = template_str.replace("{CustomerName}", cust.name).replace("{InvoiceNumber}", str(l.id))
            
            active_bridge = DeviceRepository.get_active_bridge(db)
            status = "Queued" if active_bridge else "Pending"
            sms_id = f"SMS-{int(datetime.datetime.now().timestamp() * 1000)}"
            
            sms_data = {
                "uuid": sms_id,
                "customerId": cust.id,
                "phone": cust.phone,
                "message": message,
                "status": status,
                "createdAt": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            }
            SMSQueueRepository.save(db, sms_data)
            
            # If bridge device is connected, dispatch instantly
            if active_bridge:
                try:
                    import asyncio
                    # Send async job if running inside an event loop, or pass to queue
                    # The device websocket loop will automatically check the queue if it reconnects
                    pass
                except Exception:
                    pass
                
            generated_count += 1
            logger.info(f"Auto-reminder queued: Customer={cust.name}, Loan={l.id}, DaysLeft={days_left}")
            
    return generated_count

def run_daily_scan():
    import time
    from backend.app.db.session import SessionLocal
    # Wait for server initialization
    time.sleep(10)
    while True:
        try:
            logger.info("Starting scheduled daily automated loan reminders scan...")
            db = SessionLocal()
            count = scan_and_queue_reminders_sync(db)
            db.close()
            logger.info(f"Daily automated scan finished. Queued {count} reminders.")
        except Exception as e:
            logger.error(f"Error in daily reminders scan: {e}")
        # Sleep for 24 hours
        time.sleep(24 * 3600)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartShop Versioned API v1")

@app.on_event("startup")
def startup_event():
    import threading
    threading.Thread(target=run_daily_scan, daemon=True).start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Insert default templates if they don't exist
db = next(get_db())
default_templates = [
    ("Thank You", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ ని సందర్శించినందుకు ధన్యవాదాలు! మీ బిల్ నంబర్: {InvoiceNumber}, అమౌంట్: ₹{LoanAmount}."),
    ("Purchase Completed", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ ఐటమ్స్ పర్చేజ్ బిల్ {InvoiceNumber} విజయవంతంగా క్రియేట్ చేయబడింది. మొత్తం అమౌంట్: ₹{LoanAmount}. ధన్యవాదాలు!"),
    ("Loan Reminder", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. {LoanEndDate} నాటి మీ లోన్ {InvoiceNumber} గడువు సమీపిస్తోంది. ఇంకా {DaysLeft} రోజులు మాత్రమే మిగిలి ఉంది."),
    ("Purchase Confirmation", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మా వద్ద కొనుగోలు చేసినందుకు ధన్యవాదాలు! మీ బిల్ నంబర్: {InvoiceNumber}, అమౌంట్: ₹{LoanAmount}."),
    ("Loan Pledge Confirmation", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. శ్రీ సాయి బాలాజీ ని ఎంచుకున్నందుకు ధన్యవాదాలు! మీ లోన్ నంబర్: {InvoiceNumber}, అమౌంట్: ₹{LoanAmount}."),
    ("Interest Payment Confirmation", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ నంబర్ {InvoiceNumber} కి సంబంధించిన వడ్డీ ₹{LoanAmount} చెల్లించబడింది. వడ్డీ {LoanEndDate} వరకు క్లియర్ చేయబడింది. ధన్యవాదాలు."),
    ("Loan Warning (30 Days)", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 30 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: {InvoiceNumber}). దయచేసి గమనించగలరు."),
    ("Loan Warning (7 Days)", "ప్రియమైన {CustomerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 7 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: {InvoiceNumber}). త్వరగా చెల్లించవలసిందిగా కోరుతున్నాము, లేనిచో అదనపు వడ్డీ వసూలు చేయబడుతుంది.")
]
for name, content in default_templates:
    SMSTemplateRepository.save(db, name, content)
db.close()

# Device Connection Manager
class WSConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, device_uuid: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[device_uuid] = websocket
        logger.info(f"Device connected to WebSocket: {device_uuid}")

    def disconnect(self, device_uuid: str):
        if device_uuid in self.active_connections:
            del self.active_connections[device_uuid]
            logger.info(f"Device disconnected from WebSocket: {device_uuid}")

    async def send_sms_job(self, device_uuid: str, job: dict):
        if device_uuid in self.active_connections:
            await self.active_connections[device_uuid].send_text(json.dumps({
                "type": "sms_job",
                "data": job
            }))
            logger.info(f"Sent SMS job {job['smsId']} to device {device_uuid}")
            return True
        return False

ws_manager = WSConnectionManager()

# Browser WebSocket manager for real-time state synchronization
class BrowserWSManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("Browser client connected to real-time events.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("Browser client disconnected.")

    async def broadcast(self, message: dict):
        for conn in list(self.active_connections):
            try:
                await conn.send_text(json.dumps(message))
            except Exception:
                self.active_connections.discard(conn)

browser_ws = BrowserWSManager()

# Version 1 Endpoints
@app.get("/api/v1/dashboard-data")
def get_dashboard_data(db: Session = Depends(get_db)):
    customers = CustomerRepository.get_all(db)
    transactions = TransactionRepository.get_all(db)
    sms_templates = SMSTemplateRepository.get_all(db)
    sms_queue = SMSQueueRepository.get_all(db)
    sms_devices = DeviceRepository.get_all(db)
    
    # Calculate reminders status
    today = datetime.date.today()
    loans = db.query(Transaction).filter(Transaction.type == "loan", Transaction.status != "Cleared").all()
    reminders = []
    
    for l in loans:
        try:
            details = json.loads(l.itemsJson) if l.itemsJson else {}
        except Exception:
            details = {}
            
        if isinstance(details, dict):
            taken_date_str = details.get("takenDate", l.date)
            end_date_str = details.get("endDate")
        else:
            taken_date_str = l.date
            end_date_str = None
        
        if not end_date_str:
            try:
                taken_dt = datetime.datetime.strptime(taken_date_str, "%Y-%m-%d").date()
            except Exception:
                taken_dt = today
            if l.category == "Silver":
                end_dt = taken_dt + datetime.timedelta(days=90)
            else:
                end_dt = taken_dt + datetime.timedelta(days=365)
            end_date_str = end_dt.strftime("%Y-%m-%d")
            
        try:
            end_dt = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except Exception:
            end_dt = today
            
        days_left = (end_dt - today).days
        
        if days_left <= 30:
            cust = db.query(Customer).filter(Customer.id == l.customerId).first()
            reminders.append({
                "txnId": l.id,
                "customerName": cust.name if cust else "Unknown",
                "phone": cust.phone if cust else "-",
                "daysLeft": days_left,
                "status": "Due" if days_left <= 0 else "Approaching"
            })
            
    catalog_items = ItemCatalogRepository.get_all(db)
    
    return {
        "customers": [dict(id=c.id, name=c.name, phone=c.phone, address=c.address, father=c.father, idproof=c.idproof, mandal=c.mandal) for c in customers],
        "transactions": transactions,
        "smsTemplates": [dict(id=t.id, name=t.name, content=t.content) for t in sms_templates],
        "smsQueue": [
            dict(
                id=s.uuid,
                customer_id=s.customerId,
                phone=s.phone,
                message=s.message,
                status=s.status,
                retry_count=s.retryCount,
                created_time=s.createdAt
            ) for s in sms_queue
        ],
        "smsDevices": [
            dict(
                id=d.deviceUuid,
                name=d.name,
                model=d.model,
                battery=d.battery,
                sim=d.operator,
                status=d.connectionStatus,
                connection=d.connectionStatus,
                last_seen=d.lastSeen
            ) for d in sms_devices
        ],
        "itemsCatalog": catalog_items,
        "remindersStatus": reminders
    }

@app.get("/api/v1/customers")
def get_customers(db: Session = Depends(get_db)):
    customers = CustomerRepository.get_all(db)
    return [dict(id=c.id, name=c.name, phone=c.phone, address=c.address, father=c.father, idproof=c.idproof, mandal=c.mandal) for c in customers]

@app.post("/api/v1/customers")
async def save_customer(body: dict, db: Session = Depends(get_db)):
    CustomerRepository.save(db, body)
    await browser_ws.broadcast({"type": "update", "topic": "customers"})
    return {"status": "success"}

@app.delete("/api/v1/customers/{customer_id}")
async def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    success = CustomerRepository.delete(db, customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    await browser_ws.broadcast({"type": "update", "topic": "customers"})
    return {"status": "success"}


@app.get("/api/v1/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return TransactionRepository.get_all(db)

@app.post("/api/v1/transactions")
async def save_transaction(body: dict, db: Session = Depends(get_db)):
    TransactionRepository.save(db, body)
    await browser_ws.broadcast({"type": "update", "topic": "transactions"})
    return {"status": "success"}

@app.post("/api/v1/transactions/clear")
async def clear_transaction(body: dict, db: Session = Depends(get_db)):
    txn_id = body.get("txnId")
    cleared_date = body.get("clearedDate") or datetime.datetime.now().strftime("%Y-%m-%d")
    txn = TransactionRepository.get_by_id(db, txn_id)
    if txn:
        txn.status = "Cleared"
        txn.clearedDate = cleared_date
        # Also inject clearedDate inside itemsJson structure for complete nesting
        try:
            import json
            data = json.loads(txn.itemsJson)
            if isinstance(data, dict):
                data["clearedDate"] = cleared_date
                txn.itemsJson = json.dumps(data)
        except Exception:
            pass
        db.commit()
        await browser_ws.broadcast({"type": "update", "topic": "transactions"})
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Transaction not found")

@app.post("/api/v1/sms/send")
async def queue_sms(body: dict, db: Session = Depends(get_db)):
    uuid = body.get("id")
    customer_id = body.get("customerId")
    phone = body.get("phone")
    message = body.get("message")
    
    # Do not try to send SMS if the phone number is missing, placeholder, or invalid
    if not phone or phone.strip() in ["", "-", "null", "None", "undefined"]:
        logger.info(f"Skipping SMS queue: No valid phone number for customer {customer_id}")
        return {"status": "skipped", "reason": "No phone number available"}
    
    # Check if a bridge device is connected
    active_bridge = DeviceRepository.get_active_bridge(db)
    status = "Queued" if active_bridge else "Pending"
    
    sms_data = {
        "uuid": uuid,
        "customerId": customer_id,
        "phone": phone,
        "message": message,
        "status": status,
        "createdAt": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }
    
    SMSQueueRepository.save(db, sms_data)
    logger.info(f"SMS Queued: ID={uuid}, To={phone}, InitialStatus={status}")
    
    # Send instantly if bridge is connected
    if active_bridge:
        job = {
            "smsId": uuid,
            "phone": phone,
            "message": message
        }
        await ws_manager.send_sms_job(active_bridge.deviceUuid, job)
        sms_data["status"] = "Sending"
        SMSQueueRepository.save(db, sms_data)
        
    await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})
    return {"status": "success", "sms_id": uuid}

@app.get("/api/v1/sms/queue")
def get_queue(db: Session = Depends(get_db)):
    queue = SMSQueueRepository.get_all(db)
    return [
        dict(
            id=s.uuid,
            customer_id=s.customerId,
            phone=s.phone,
            message=s.message,
            status=s.status,
            retry_count=s.retryCount,
            created_time=s.createdAt
        ) for s in queue
    ]

@app.post("/api/v1/sms/retry")
async def retry_sms(body: dict, db: Session = Depends(get_db)):
    sms_id = body.get("smsId")
    sms = SMSQueueRepository.get_by_uuid(db, sms_id)
    if sms:
        sms.status = "Queued"
        sms.retryCount += 1
        db.commit()
        logger.info(f"Retrying SMS job: {sms_id}")
        await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})
    return {"status": "success"}

@app.post("/api/v1/sms/cancel")
async def cancel_sms(body: dict, db: Session = Depends(get_db)):
    sms_id = body.get("smsId")
    sms = SMSQueueRepository.get_by_uuid(db, sms_id)
    if sms:
        sms.status = "Cancelled"
        db.commit()
        logger.info(f"Cancelled SMS job: {sms_id}")
        await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})
    return {"status": "success"}

@app.get("/api/v1/sms/templates")
def get_templates(db: Session = Depends(get_db)):
    templates = SMSTemplateRepository.get_all(db)
    return [dict(id=t.id, name=t.name, content=t.content) for t in templates]

@app.post("/api/v1/sms/template")
async def add_template(body: dict, db: Session = Depends(get_db)):
    SMSTemplateRepository.save(db, body.get("name"), body.get("content"), body.get("id"))
    await browser_ws.broadcast({"type": "update", "topic": "templates"})
    return {"status": "success"}

@app.post("/api/v1/sms/template/delete")
async def delete_template(body: dict, db: Session = Depends(get_db)):
    name = body.get("name")
    success = SMSTemplateRepository.delete(db, name)
    if success:
        await browser_ws.broadcast({"type": "update", "topic": "templates"})
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Template not found")

@app.get("/api/v1/items")
def get_items(db: Session = Depends(get_db)):
    items = ItemCatalogRepository.get_all(db)
    return [dict(id=i.id, name=i.name, category=i.category) for i in items]

@app.post("/api/v1/items")
async def save_item(body: dict, db: Session = Depends(get_db)):
    ItemCatalogRepository.save(db, body)
    await browser_ws.broadcast({"type": "update", "topic": "items"})
    return {"status": "success"}

@app.delete("/api/v1/items/{item_id}")
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    ItemCatalogRepository.delete(db, item_id)
    await browser_ws.broadcast({"type": "update", "topic": "items"})
    return {"status": "success"}

@app.get("/api/v1/loans/reminders-status")
def get_reminders_status(db: Session = Depends(get_db)):
    from backend.app.models.models import SMSQueue, Customer
    today = datetime.date.today()
    loans = db.query(Transaction).filter(Transaction.type == "loan", Transaction.status != "Cleared").all()
    result = []
    
    for l in loans:
        try:
            details = json.loads(l.itemsJson) if l.itemsJson else {}
        except Exception:
            details = {}
            
        taken_date_str = details.get("takenDate", l.date)
        end_date_str = details.get("endDate")
        
        if not end_date_str:
            taken_dt = datetime.datetime.strptime(taken_date_str, "%Y-%m-%d").date()
            if l.category == "Silver":
                end_dt = taken_dt + datetime.timedelta(days=90)
            else:
                end_dt = taken_dt + datetime.timedelta(days=365)
            end_date_str = end_dt.strftime("%Y-%m-%d")
            
        end_dt = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
        days_left = (end_dt - today).days
        
        cust = db.query(Customer).filter(Customer.id == l.customerId).first()
        if not cust:
            continue
            
        # Check if 30-day and 7-day reminders are sent
        sent_30 = db.query(SMSQueue).filter(
            SMSQueue.phone == cust.phone,
            SMSQueue.message.like(f"%{l.id}%"),
            SMSQueue.message.like(f"%30 రోజులు%")
        ).first() is not None
        
        sent_7 = db.query(SMSQueue).filter(
            SMSQueue.phone == cust.phone,
            SMSQueue.message.like(f"%{l.id}%"),
            SMSQueue.message.like(f"%7 రోజులు%")
        ).first() is not None
        
        result.append({
            "loanId": l.id,
            "customerId": cust.id,
            "customerName": cust.name,
            "phone": cust.phone,
            "amount": l.amount,
            "endDate": end_date_str,
            "daysLeft": days_left,
            "sent30Day": sent_30,
            "sent7Day": sent_7,
            "status": "Due" if days_left <= 0 else "Approaching"
        })
        
    return result

@app.post("/api/v1/loans/trigger-reminders")
async def trigger_reminders(db: Session = Depends(get_db)):
    count = scan_and_queue_reminders_sync(db)
    if count > 0:
        await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})
    return {"status": "success", "count": count}

@app.get("/api/v1/devices")
def get_devices(db: Session = Depends(get_db)):
    devices = DeviceRepository.get_all(db)
    return [
        dict(
            id=d.deviceUuid,
            name=d.name,
            model=d.model,
            battery=d.battery,
            sim=d.operator,
            status=d.connectionStatus,
            connection=d.connectionStatus,
            last_seen=d.lastSeen
        ) for d in devices
    ]

@app.post("/api/v1/devices/register")
async def register_device(body: dict, db: Session = Depends(get_db)):
    device_data = {
        "deviceUuid": body.get("id"),
        "name": body.get("name"),
        "model": body.get("model"),
        "battery": body.get("battery", 100),
        "operator": body.get("sim", "Unknown"),
        "connectionStatus": "Disconnected",
        "lastSeen": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }
    DeviceRepository.save(db, device_data)
    logger.info(f"Device registered: ID={device_data['deviceUuid']}")
    await browser_ws.broadcast({"type": "update", "topic": "devices"})
    return {"status": "success"}

@app.post("/api/v1/devices/unregister")
async def unregister_device(body: dict, db: Session = Depends(get_db)):
    device_id = body.get("id")
    DeviceRepository.delete(db, device_id)
    logger.info(f"Device unregistered: ID={device_id}")
    await browser_ws.broadcast({"type": "update", "topic": "devices"})
    return {"status": "success"}

# Real-time WebSocket connection for Browser client
@app.websocket("/ws/v1/browser")
async def ws_v1_browser(websocket: WebSocket):
    await browser_ws.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        browser_ws.disconnect(websocket)

# Secure versioned WebSocket for Android SMS Bridge
@app.websocket("/ws/v1/sms-bridge")
async def ws_v1_sms_bridge(
    websocket: WebSocket,
    device_uuid: str = Query(...),
    token: str = Query(None),
    db: Session = Depends(get_db)
):
    # Verify Device token
    device = DeviceRepository.get_by_uuid(db, device_uuid)
    if not device:
        logger.warning(f"WebSocket Connection Rejected: Unregistered device {device_uuid}")
        await websocket.close(code=4003)
        return

    # Accept & Track WebSocket Connection
    await ws_manager.connect(device_uuid, websocket)
    
    # Update Connection details
    device.connectionStatus = "Connected"
    device.isOnline = True
    device.lastSeen = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    db.commit()
    await browser_ws.broadcast({"type": "update", "topic": "devices"})
    
    try:
        # Check and send any pending SMS in the queue on connect
        pending = SMSQueueRepository.get_pending_job(db)
        if pending:
            await ws_manager.send_sms_job(device_uuid, {
                "smsId": pending.uuid,
                "phone": pending.phone,
                "message": pending.message
            })
            pending.status = "Sending"
            db.commit()
            await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})

        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "device_status":
                status_info = message.get("data", {})
                device.battery = status_info.get("battery", 100)
                device.operator = status_info.get("sim", "Unknown")
                device.lastSeen = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                db.commit()
                await browser_ws.broadcast({"type": "update", "topic": "devices"})
                
            elif message.get("type") == "sms_result":
                result = message.get("data", {})
                sms_id = result.get("smsId")
                status = result.get("status") # Sent, Failed, Cancelled
                
                sms = SMSQueueRepository.get_by_uuid(db, sms_id)
                if sms:
                    sms.status = status
                    sms.completedAt = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                    if status == "Failed":
                        sms.errorMessage = result.get("error", "Failed to send")
                    db.commit()
                    logger.info(f"SMS result received from {device_uuid}: ID={sms_id}, Status={status}")
                    await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})
                    
                # Process next pending SMS
                next_pending = SMSQueueRepository.get_pending_job(db)
                if next_pending:
                    await ws_manager.send_sms_job(device_uuid, {
                        "smsId": next_pending.uuid,
                        "phone": next_pending.phone,
                        "message": next_pending.message
                    })
                    next_pending.status = "Sending"
                    db.commit()
                    await browser_ws.broadcast({"type": "update", "topic": "sms_queue"})

    except WebSocketDisconnect:
        ws_manager.disconnect(device_uuid)
        # Update Connection details
        device.connectionStatus = "Disconnected"
        device.isOnline = False
        device.lastSeen = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        db.commit()
        await browser_ws.broadcast({"type": "update", "topic": "devices"})

from fastapi.staticfiles import StaticFiles
import os
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
testing_dir = os.path.join(base_dir, "testing")
app.mount("/testing", StaticFiles(directory=testing_dir), name="testing")


