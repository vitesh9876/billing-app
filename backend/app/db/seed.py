import json
import datetime
from backend.app.db.session import engine, SessionLocal, Base
from backend.app.models.models import Customer, Transaction, SMSTemplate, ItemCatalog

# Make sure tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # 1. Clear existing data
    db.query(Customer).delete()
    db.query(Transaction).delete()
    db.query(SMSTemplate).delete()
    db.query(ItemCatalog).delete()
    db.commit()

    # 2. Add sample customers
    c1 = Customer(id="CUST-001", name="Sri M. Rajesh", phone="9876543210", address="Gannavaram Main Bazar", father="M. Satyanarayana", idproof="Aadhar 1234-5678-9012", mandal="Gannavaram")
    c2 = Customer(id="CUST-002", name="S. Venkat", phone="8765432109", address="Vijayawada Road, Flat 301", father="S. Apparao", idproof="Ration Card 998877", mandal="Vijayawada Rural")
    c3 = Customer(id="CUST-003", name="K. Latha", phone="7654321098", address="Temple Street, Gannavaram", father="K. Srinivasa Rao", idproof="Voter ID KSR5544", mandal="Gannavaram")
    c4 = Customer(id="CUST-004", name="T. Ramakrishna", phone="9988776655", address="Gannavaram Post Office Road", father="T. Venkateswara Rao", idproof="Aadhar 9876-1234-5678", mandal="Gannavaram")
    c5 = Customer(id="CUST-005", name="P. Satyavathi", phone="8877665544", address="Hanuman Junction, Gudiwada Road", father="P. Subba Rao", idproof="Ration 112233", mandal="Bapulapadu")
    c6 = Customer(id="CUST-006", name="V. Prasad", phone="7766554433", address="Gannavaram Main Bazar", father="V. Raghavaiah", idproof="Voter ID XYZ7788", mandal="Gannavaram")
    db.add_all([c1, c2, c3, c4, c5, c6])
    db.commit()

    # Helpers for dates
    now = datetime.datetime.now()
    def get_past_date(days):
        return (now - datetime.timedelta(days=days)).strftime("%Y-%m-%d")

    def get_future_date(start_str, days):
        dt = datetime.datetime.strptime(start_str, "%Y-%m-%d")
        return (dt + datetime.timedelta(days=days)).strftime("%Y-%m-%d")

    # 3. Add sample transactions following the new business rules:
    # Rule: Gold (> 8000) -> 2%, Gold (<= 8000) -> 3%, Silver -> 5%
    # Rule: Gold -> +365 days, Silver -> +90 days
    
    # Txn 1: Gold Loan > 8000 (Sri M. Rajesh)
    taken_date_1 = get_past_date(45)
    t1 = Transaction(
        id="L★-001",
        customerId="CUST-001",
        type="loan",
        amount=65000, # > 8000 -> 2.0%
        category="Jewelry",
        date=taken_date_1,
        itemsJson=json.dumps({
            "items": [
                {"qty": 1, "name": "Gold Chain", "yield": "916 KDM", "grossWeight": 14.5, "netWeight": 14.2, "value": 75000, "remarks": "Very good condition"}
            ],
            "interestRate": "2.0%",
            "takenDate": taken_date_1,
            "endDate": get_future_date(taken_date_1, 365) # Gold -> +365 days
        })
    )

    # Txn 2: Purchase table (Sri M. Rajesh)
    t2 = Transaction(
        id="F-001",
        customerId="CUST-001",
        type="purchase",
        amount=12000,
        category="Furniture",
        date=get_past_date(15),
        itemsJson=json.dumps([
            {"particulars": "Wooden Study Table", "grams": 0, "mg": 0, "qty": 1, "amount": 12000}
        ])
    )

    # Txn 3: Silver Loan (S. Venkat)
    taken_date_3 = get_past_date(30)
    t3 = Transaction(
        id="L-001",
        customerId="CUST-002",
        type="loan",
        amount=12000, # Silver -> 5%
        category="Jewelry",
        date=taken_date_3,
        itemsJson=json.dumps({
            "items": [
                {"qty": 1, "name": "Silver Anklets", "yield": "92.5 Sterling", "grossWeight": 150.0, "netWeight": 148.0, "value": 15000, "remarks": "Pair"}
            ],
            "interestRate": "5.0%",
            "takenDate": taken_date_3,
            "endDate": get_future_date(taken_date_3, 90) # Silver -> +90 days
        })
    )

    # Txn 4: Gold Loan <= 8000 (K. Latha)
    taken_date_4 = get_past_date(20)
    t4 = Transaction(
        id="L-002",
        customerId="CUST-003",
        type="loan",
        amount=5000, # Gold <= 8000 -> 3.0%
        category="Jewelry",
        date=taken_date_4,
        itemsJson=json.dumps({
            "items": [
                {"qty": 1, "name": "Gold Ring", "yield": "22C KDM", "grossWeight": 2.5, "netWeight": 2.4, "value": 12000, "remarks": ""}
            ],
            "interestRate": "3.0%",
            "takenDate": taken_date_4,
            "endDate": get_future_date(taken_date_4, 365) # Gold -> +365 days
        })
    )

    # Txn 5: Silver Loan (T. Ramakrishna)
    taken_date_5 = get_past_date(10)
    t5 = Transaction(
        id="L-003",
        customerId="CUST-004",
        type="loan",
        amount=2500, # Silver -> 5%
        category="Jewelry",
        date=taken_date_5,
        itemsJson=json.dumps({
            "items": [
                {"qty": 1, "name": "Silver Plate", "yield": "Fine Silver", "grossWeight": 80.0, "netWeight": 80.0, "value": 6000, "remarks": ""}
            ],
            "interestRate": "5.0%",
            "takenDate": taken_date_5,
            "endDate": get_future_date(taken_date_5, 90) # Silver -> +90 days
        })
    )
    
    # 4. Insert SMSTemplates
    tpl1 = SMSTemplate(name="Thank You", content="Dear {CustomerName}, thank you for purchasing from Sri Sai Balaji! Your invoice number is {InvoiceNumber} for amount ₹{LoanAmount}.")
    tpl2 = SMSTemplate(name="Loan Reminder", content="Dear {CustomerName}, this is a reminder from Sri Sai Balaji. Your loan taken on {InvoiceNumber} with amount ₹{LoanAmount} is due on {LoanEndDate}. Please clear early.")
    
    # 5. Seed ItemCatalog list (separated by category)
    items = [
        # Jewelry items
        ItemCatalog(name="Gold Ring", category="Jewelry"),
        ItemCatalog(name="Gold Chain", category="Jewelry"),
        ItemCatalog(name="Gold Necklace", category="Jewelry"),
        ItemCatalog(name="Gold Bangle", category="Jewelry"),
        ItemCatalog(name="Gold Studs", category="Jewelry"),
        ItemCatalog(name="Silver Anklets", category="Jewelry"),
        ItemCatalog(name="Silver Plate", category="Jewelry"),
        ItemCatalog(name="Silver Glass", category="Jewelry"),
        
        # Furniture items
        ItemCatalog(name="Wooden Study Table", category="Furniture"),
        ItemCatalog(name="Office Chair", category="Furniture"),
        ItemCatalog(name="Teakwood Sofa Set", category="Furniture"),
        ItemCatalog(name="Queen Size Bed", category="Furniture"),
        ItemCatalog(name="Dining Table", category="Furniture"),
        ItemCatalog(name="Steel Almirah", category="Furniture")
    ]

    db.add_all([t1, t2, t3, t4, t5, tpl1, tpl2] + items)
    db.commit()

    print("Database seeded successfully with sample data and separate item lists!")

finally:
    db.close()
