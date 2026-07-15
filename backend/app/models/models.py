from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from backend.app.db.session import Base

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    father = Column(String)
    idproof = Column(String)
    mandal = Column(String)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True)
    customerId = Column(String, nullable=False)
    type = Column(String, nullable=False) # purchase or loan
    amount = Column(Integer, nullable=False)
    category = Column(String) # jewelry or furniture
    date = Column(String, nullable=False)
    itemsJson = Column(Text, nullable=False) # JSON encoded items list
    status = Column(String, default="Pending") # Pending or Cleared


class SMSQueue(Base):
    __tablename__ = "sms_queue"
    
    uuid = Column(String, primary_key=True, index=True)
    customerId = Column(String)
    phone = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    templateId = Column(String)
    priority = Column(Integer, default=1)
    status = Column(String, default="Pending") # Pending, Queued, Sending, Sent, Failed, Cancelled
    retryCount = Column(Integer, default=0)
    bridgeDeviceId = Column(String)
    createdAt = Column(String)
    scheduledAt = Column(String)
    sentAt = Column(String)
    completedAt = Column(String)
    errorMessage = Column(Text)

class Device(Base):
    __tablename__ = "devices"
    
    deviceUuid = Column(String, primary_key=True, index=True)
    name = Column(String)
    model = Column(String)
    battery = Column(Integer, default=100)
    operator = Column(String) # SIM operator
    androidVersion = Column(String)
    appVersion = Column(String)
    lastIp = Column(String)
    connectionType = Column(String) # Wifi, Mobile
    lastSeen = Column(String)
    isPrimaryHost = Column(Boolean, default=False)
    isOnline = Column(Boolean, default=False)
    connectionStatus = Column(String, default="Disconnected") # Connected, Disconnected

class SMSTemplate(Base):
    __tablename__ = "sms_templates"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    content = Column(Text, nullable=False)

class ItemCatalog(Base):
    __tablename__ = "item_catalog"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # Jewelry or Furniture
