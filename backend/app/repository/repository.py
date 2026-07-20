import json
from sqlalchemy.orm import Session
from backend.app.models.models import Customer, Transaction, SMSQueue, Device, SMSTemplate, ItemCatalog

class CustomerRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(Customer).all()
        
    @staticmethod
    def get_by_id(db: Session, customer_id: str):
        return db.query(Customer).filter(Customer.id == customer_id).first()
        
    @staticmethod
    def save(db: Session, customer_data: dict):
        cust = db.query(Customer).filter(Customer.id == customer_data["id"]).first()
        if not cust:
            cust = Customer(**customer_data)
            db.add(cust)
        else:
            for k, v in customer_data.items():
                setattr(cust, k, v)
        db.commit()
        db.refresh(cust)
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
    def get_all(db: Session):
        txns = db.query(Transaction).all()
        result = []
        for t in txns:
            item_dict = dict(
                id=t.id,
                customerId=t.customerId,
                type=t.type,
                amount=t.amount,
                category=t.category,
                date=t.date,
                status=t.status,
                clearedDate=t.clearedDate
            )
            # Unpack items from JSON
            try:
                item_dict["items"] = json.loads(t.itemsJson) if t.itemsJson else []
            except Exception:
                item_dict["items"] = []
            # Extract fields for loan compatibility if type is loan
            if t.type == "loan":
                item_dict["loanDetails"] = {
                    "items": item_dict["items"],
                    "interestRate": "1.5%", # defaults/back-compat
                    "takenDate": t.date,
                    "endDate": t.date # defaults
                }
                # Check JSON for deeper nesting
                try:
                    loaded = json.loads(t.itemsJson)
                    if isinstance(loaded, dict) and "items" in loaded:
                        item_dict["loanDetails"] = loaded
                        item_dict["items"] = loaded.get("items", [])
                except Exception:
                    pass
            result.append(item_dict)
        return result

    @staticmethod
    def get_by_id(db: Session, txn_id: str):
        return db.query(Transaction).filter(Transaction.id == txn_id).first()

    @staticmethod
    def save(db: Session, txn_data: dict):
        items_payload = txn_data.get("items", [])
        if txn_data.get("type") == "loan" and "loanDetails" in txn_data:
            # Save whole loanDetails block as JSON for complete specs
            items_payload = txn_data["loanDetails"]
            
        items_json = json.dumps(items_payload)
        
        t = db.query(Transaction).filter(Transaction.id == txn_data["id"]).first()
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
        db.commit()
        db.refresh(t)
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
