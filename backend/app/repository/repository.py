import json
import re
from sqlalchemy.orm import Session
from backend.app.models.models import Customer, Transaction, SMSQueue, Device, SMSTemplate, ItemCatalog

class TransactionConflict(ValueError):
    pass


def displayed_bill_number(txn):
    try:
        details = json.loads(txn.itemsJson)
    except (TypeError, ValueError):
        details = {}
    if isinstance(details, dict) and details.get("billNumber"):
        return details["billNumber"]
    return re.sub(r"-\d{4}$", "", txn.id.replace("BILL-", "").replace("TXN-OFFLINE-", "")).replace("*", "★", 1)

class CustomerRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(Customer).all()
        
    @staticmethod
    def get_by_id(db: Session, customer_id: str):
        return db.query(Customer).filter(Customer.id == customer_id).first()
        
    @staticmethod
    def save(db: Session, customer_data: dict, *, commit=True):
        cust = db.query(Customer).filter(Customer.id == customer_data["id"]).first()
        if not cust:
            cust = Customer(**customer_data)
            db.add(cust)
        else:
            for k, v in customer_data.items():
                setattr(cust, k, v)
        if commit:
            db.commit()
        # Save endpoints only acknowledge the commit; avoid an extra database read.
        return cust

    @staticmethod
    def delete(db: Session, customer_id: str):
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if cust:
            db.delete(cust)
            db.commit()
            return True
        return False

class TransactionRepository:
    @staticmethod
    def to_dict(t):
        result = dict(id=t.id, customerId=t.customerId, type=t.type, amount=t.amount,
                      category=t.category, date=t.date, status=t.status, clearedDate=t.clearedDate)
        try:
            loaded = json.loads(t.itemsJson) if t.itemsJson else []
        except (TypeError, ValueError):
            loaded = []
        result["items"] = loaded
        if t.type == "loan":
            if isinstance(loaded, dict) and "items" in loaded:
                result["loanDetails"] = loaded
                result["items"] = loaded.get("items", [])
            else:
                result["loanDetails"] = dict(items=loaded, interestRate="1.5%", takenDate=t.date, endDate=t.date)
        return result

    @staticmethod
    def get_all(db: Session):
        return [TransactionRepository.to_dict(t) for t in db.query(Transaction).all()]

    @staticmethod
    def get_by_id(db: Session, txn_id: str):
        return db.query(Transaction).filter(Transaction.id == txn_id).first()

    @staticmethod
    def save(db: Session, txn_data: dict, *, commit=True):
        items_payload = txn_data.get("items", [])
        if txn_data.get("type") == "loan" and "loanDetails" in txn_data:
            # Save whole loanDetails block as JSON for complete specs
            items_payload = txn_data["loanDetails"]
            
        items_json = json.dumps(items_payload)
        
        t = db.query(Transaction).filter(Transaction.id == txn_data["id"]).with_for_update().first()
        if t and txn_data.get("createOnly"):
            raise TransactionConflict("This bill already exists. Open the existing loan to edit it instead.")
        if txn_data.get("updateOnly") and not t:
            raise TransactionConflict("This loan was deleted. Refresh your records before editing.")
        expected = txn_data.get("expectedTransaction")
        if t and expected is not None and TransactionRepository.to_dict(t) != expected:
            raise TransactionConflict("This record was changed elsewhere. Refresh it before saving so no changes are lost.")
        if txn_data.get("type") == "loan" and isinstance(items_payload, dict) and "billNumber" in items_payload:
            bill_number = str(items_payload["billNumber"]).strip()
            if not bill_number:
                raise TransactionConflict("Please enter a bill number.")
            year = str(txn_data["date"])[:4]
            if not t or displayed_bill_number(t) != bill_number or str(t.date)[:4] != year:
                other_loans = db.query(Transaction.id, Transaction.itemsJson).filter(
                    Transaction.type == "loan", Transaction.id != txn_data["id"], Transaction.date.startswith(year)
                ).all()
                if any(displayed_bill_number(other) == bill_number for other in other_loans):
                    raise TransactionConflict("This bill number already belongs to another loan in the same year. Choose a different number.")
        if not t:
            t = Transaction(
                id=txn_data["id"],
                customerId=txn_data["customerId"],
                type=txn_data["type"],
                amount=txn_data["amount"],
                category=txn_data.get("category", "Jewelry"),
                date=txn_data["date"],
                itemsJson=items_json,
                status=txn_data.get("status", "Pending" if txn_data["type"] == "loan" else "Cleared"),
                clearedDate=txn_data.get("clearedDate")
            )
            db.add(t)
        else:
            t.customerId = txn_data["customerId"]
            t.amount = txn_data["amount"]
            t.category = txn_data.get("category", "Jewelry")
            t.date = txn_data["date"]
            t.itemsJson = items_json
            if "status" in txn_data:
                t.status = txn_data["status"]
            if "clearedDate" in txn_data:
                t.clearedDate = txn_data["clearedDate"]
        if commit:
            db.commit()
        # The client refreshes records separately after a successful commit.
        return t

    @staticmethod
    def delete(db: Session, txn_id: str):
        t = db.query(Transaction).filter(Transaction.id == txn_id).first()
        if t:
            db.delete(t)
            db.commit()
            return True
        return False

class SMSQueueRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(SMSQueue).all()

    @staticmethod
    def get_by_uuid(db: Session, uuid: str):
        return db.query(SMSQueue).filter(SMSQueue.uuid == uuid).first()

    @staticmethod
    def get_pending_job(db: Session):
        return db.query(SMSQueue).filter(SMSQueue.status.in_(["Pending", "Queued"])).first()

    @staticmethod
    def save(db: Session, sms_data: dict):
        sms = db.query(SMSQueue).filter(SMSQueue.uuid == sms_data["uuid"]).first()
        if not sms:
            sms = SMSQueue(**sms_data)
            db.add(sms)
        else:
            for k, v in sms_data.items():
                setattr(sms, k, v)
        db.commit()
        db.refresh(sms)
        return sms

class DeviceRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(Device).all()

    @staticmethod
    def get_by_uuid(db: Session, uuid: str):
        return db.query(Device).filter(Device.deviceUuid == uuid).first()

    @staticmethod
    def get_active_bridge(db: Session):
        return db.query(Device).filter(Device.connectionStatus == "Connected").first()

    @staticmethod
    def save(db: Session, device_data: dict):
        dev = db.query(Device).filter(Device.deviceUuid == device_data["deviceUuid"]).first()
        if not dev:
            dev = Device(**device_data)
            db.add(dev)
        else:
            for k, v in device_data.items():
                setattr(dev, k, v)
        db.commit()
        db.refresh(dev)
        return dev

    @staticmethod
    def delete(db: Session, uuid: str):
        dev = db.query(Device).filter(Device.deviceUuid == uuid).first()
        if dev:
            db.delete(dev)
            db.commit()
            return True
        return False

class SMSTemplateRepository:
    @staticmethod
    def seed_defaults(db: Session, templates):
        existing_names = {name for (name,) in db.query(SMSTemplate.name).all()}
        added = 0
        for name, content in templates:
            if name not in existing_names:
                db.add(SMSTemplate(name=name, content=content))
                existing_names.add(name)
                added += 1
        if added:
            db.commit()
        return added

    @staticmethod
    def get_all(db: Session):
        return db.query(SMSTemplate).all()

    @staticmethod
    def save(db: Session, name: str, content: str, template_id: int = None):
      if template_id:
          tpl = db.query(SMSTemplate).filter(SMSTemplate.id == template_id).first()
          if tpl:
              tpl.name = name
              tpl.content = content
              db.commit()
              db.refresh(tpl)
              return tpl
      tpl = db.query(SMSTemplate).filter(SMSTemplate.name == name).first()
      if not tpl:
          tpl = SMSTemplate(name=name, content=content)
          db.add(tpl)
      else:
          tpl.content = content
      db.commit()
      db.refresh(tpl)
      return tpl

    @staticmethod
    def delete(db: Session, name: str):
      tpl = db.query(SMSTemplate).filter(SMSTemplate.name == name).first()
      if tpl:
          db.delete(tpl)
          db.commit()
          return True
      return False

class ItemCatalogRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(ItemCatalog).all()

    @staticmethod
    def get_by_category(db: Session, category: str):
        return db.query(ItemCatalog).filter(ItemCatalog.category == category).all()

    @staticmethod
    def get_by_id(db: Session, item_id: int):
        return db.query(ItemCatalog).filter(ItemCatalog.id == item_id).first()

    @staticmethod
    def get_by_name_and_category(db: Session, name: str, category: str):
        return db.query(ItemCatalog).filter(ItemCatalog.name == name, ItemCatalog.category == category).first()

    @staticmethod
    def save(db: Session, item_data: dict):
        item = None
        if "id" in item_data and item_data["id"]:
            item = db.query(ItemCatalog).filter(ItemCatalog.id == item_data["id"]).first()
        if not item:
            # Check by name and category first to avoid duplicates
            item = db.query(ItemCatalog).filter(ItemCatalog.name == item_data["name"], ItemCatalog.category == item_data["category"]).first()
            
        if not item:
            item = ItemCatalog(name=item_data["name"], category=item_data["category"])
            db.add(item)
        else:
            item.name = item_data["name"]
            item.category = item_data["category"]
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, item_id: int):
        item = db.query(ItemCatalog).filter(ItemCatalog.id == item_id).first()
        if item:
            db.delete(item)
            db.commit()
            return True
        return False
