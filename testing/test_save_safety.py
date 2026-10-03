"""Run directly: python testing/test_save_safety.py (requires backend deps + httpx).

The application is imported only after selecting a temporary database and working
directory. Neither startup seeding nor tests can reach a configured live database.
"""
import asyncio
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import AsyncMock, patch


class SaveSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sandbox = tempfile.TemporaryDirectory(prefix="billing-save-tests-")
        cls.original_cwd = os.getcwd()
        cls.original_url = os.environ.get("DATABASE_URL")
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        os.chdir(cls.sandbox.name)
        os.environ["DATABASE_URL"] = "sqlite:///./test-only.db"
        from backend.app import main
        from fastapi.testclient import TestClient
        cls.api = main
        # Do not enter the client context: tests do not start the daily SMS scanner.
        cls.client = TestClient(main.app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.api.engine.dispose()
        cls.api.logger.removeHandler(cls.api.file_handler)
        cls.api.file_handler.close()
        os.chdir(cls.original_cwd)
        if cls.original_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = cls.original_url
        cls.sandbox.cleanup()

    def loan(self, txn_id):
        return {
            "id": txn_id, "customerId": "TEST-CUSTOMER", "type": "loan",
            "amount": 4200, "category": "Jewelry", "date": "2026-10-02",
            "status": "Pending", "loanDetails": {
                "takenDate": "2026-10-02", "endDate": "2027-10-02",
                "interestRate": "3%", "note": "Preserve all details",
                "interestPayments": [{"amountPaid": 75, "paidUpto": "2026-10-02"}],
                "topups": [], "items": [{"name": "ring", "qty": 2, "grossWeight": 3.5}],
            },
        }

    def test_customer_and_loan_are_committed_before_notification(self):
        body = {"id": "TEST-CUSTOMER", "name": "Test", "phone": "1234567890", "address": "Test"}
        async def notified(message):
            # A new session can already see the committed data.
            from backend.app.db.session import SessionLocal
            with SessionLocal() as db:
                if message["topic"] == "customers":
                    self.assertEqual(self.api.CustomerRepository.get_by_id(db, body["id"]).name, "Test")
                else:
                    saved = self.api.TransactionRepository.get_by_id(db, "TEST-COMMIT")
                    self.assertEqual(json.loads(saved.itemsJson), payload["loanDetails"])
        with patch.object(self.api.browser_ws, "broadcast", side_effect=notified) as broadcast:
            self.assertEqual(self.client.post("/api/v1/customers", json=body).status_code, 200)
            payload = self.loan("TEST-COMMIT")
            self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
            self.assertEqual(broadcast.call_count, 2)

    def test_failed_write_does_not_report_success_or_notify(self):
        with patch.object(self.api.TransactionRepository, "save", side_effect=RuntimeError("Database unavailable")), patch.object(self.api.browser_ws, "broadcast", new_callable=AsyncMock) as broadcast:
            response = self.client.post("/api/v1/transactions", json=self.loan("TEST-FAILED"))
            self.assertEqual(response.status_code, 500)
            broadcast.assert_not_called()
        records = self.client.get("/api/v1/transactions").json()
        self.assertFalse(any(t["id"] == "TEST-FAILED" for t in records))

    def test_loan_update_and_clear_preserve_nested_details(self):
        payload = self.loan("TEST-EDIT")
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        payload["amount"] = 5000
        payload["loanDetails"]["note"] = "Updated note"
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/transactions/clear", json={"txnId": payload["id"], "clearedDate": "2026-10-03"}).status_code, 200)
        saved = next(t for t in self.client.get("/api/v1/transactions").json() if t["id"] == payload["id"])
        self.assertEqual(saved["amount"], 5000)
        self.assertEqual(saved["status"], "Cleared")
        expected = dict(payload["loanDetails"], clearedDate="2026-10-03")
        self.assertEqual(saved["loanDetails"], expected)

    def test_failed_commit_rolls_back_existing_loan(self):
        from sqlalchemy.orm import Session
        payload = self.loan("TEST-ROLLBACK")
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        payload["amount"] = 9999
        with patch.object(Session, "commit", side_effect=RuntimeError("Commit failed")), patch.object(self.api.browser_ws, "broadcast", new_callable=AsyncMock) as broadcast:
            self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 500)
            broadcast.assert_not_called()
        saved = next(t for t in self.client.get("/api/v1/transactions").json() if t["id"] == payload["id"])
        self.assertEqual(saved["amount"], 4200)

    def test_response_sent_before_notification_and_write_runs_off_event_loop(self):
        async def run():
            response_events = []
            loop_thread = threading.get_ident()
            writer_threads = []
            original_save = self.api.TransactionRepository.save
            def save(db, body, **kwargs):
                writer_threads.append(threading.get_ident())
                return original_save(db, body, **kwargs)
            async def notify(message):
                self.assertTrue(any(event["type"] == "http.response.body" for event in response_events))
            payload = json.dumps(self.loan("TEST-RESPONSE")).encode()
            scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http", "path": "/api/v1/transactions", "raw_path": b"/api/v1/transactions", "query_string": b"", "headers": [(b"content-type", b"application/json")], "client": ("test", 123), "server": ("test", 80), "root_path": ""}
            received = False
            async def receive():
                nonlocal received
                if received:
                    await asyncio.Event().wait()
                received = True
                return {"type": "http.request", "body": payload, "more_body": False}
            async def send(message):
                response_events.append(message)
            with patch.object(self.api.TransactionRepository, "save", side_effect=save), patch.object(self.api.browser_ws, "broadcast", side_effect=notify):
                await self.api.app(scope, receive, send)
            self.assertEqual(response_events[0]["status"], 200)
            self.assertEqual(len(writer_threads), 1)
            self.assertNotEqual(writer_threads[0], loop_thread)
        asyncio.run(run())

    def test_slow_browser_does_not_delay_healthy_browser(self):
        async def run():
            healthy_sent = asyncio.Event()
            class SlowBrowser:
                async def send_text(self, payload):
                    await asyncio.sleep(60)
            class HealthyBrowser:
                async def send_text(self, payload):
                    self.payload = json.loads(payload)
                    healthy_sent.set()
            slow, healthy = SlowBrowser(), HealthyBrowser()
            manager = self.api.BrowserWSManager()
            manager.active_connections = {slow, healthy}
            task = asyncio.create_task(manager.broadcast({"type": "update"}))
            await asyncio.wait_for(healthy_sent.wait(), timeout=0.5)
            await asyncio.wait_for(task, timeout=3)
            self.assertNotIn(slow, manager.active_connections)
            self.assertIn(healthy, manager.active_connections)
        asyncio.run(run())

    def test_other_save_routes_and_missing_records(self):
        self.assertEqual(self.client.post("/api/v1/items", json={"name": "Test item", "category": "Jewelry"}).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/sms/template", json={"name": "Test template", "content": "Test text"}).status_code, 200)
        self.assertEqual(self.client.delete("/api/v1/transactions/DOES-NOT-EXIST").status_code, 404)
        self.assertEqual(self.client.post("/api/v1/transactions/clear", json={"txnId": "DOES-NOT-EXIST"}).status_code, 404)

    def test_edit_bill_number_keeps_record_and_payment_history(self):
        payload = self.loan("BILL-901-2026")
        payload["loanDetails"]["accumulatedInterest"] = 650
        payload["loanDetails"]["topups"] = [{"extraAmount": 1000, "remarks": "Existing topup"}]
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        before = self.client.get("/api/v1/transactions").json()
        payload["loanDetails"]["billNumber"] = "★902"
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        after = self.client.get("/api/v1/transactions").json()
        self.assertEqual(len(after), len(before))
        saved = next(t for t in after if t["id"] == payload["id"])
        self.assertEqual(saved["loanDetails"], payload["loanDetails"])
        self.assertEqual(saved["amount"], payload["amount"])

    def test_duplicate_bill_number_rejected_without_changing_either_loan(self):
        first, second = self.loan("BILL-903-2026"), self.loan("BILL-904-2026")
        for payload in (first, second):
            self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        second["loanDetails"]["billNumber"] = "903"
        with patch.object(self.api.browser_ws, "broadcast", new_callable=AsyncMock) as broadcast:
            response = self.client.post("/api/v1/transactions", json=second)
            self.assertEqual(response.status_code, 409)
            broadcast.assert_not_called()
        saved = next(t for t in self.client.get("/api/v1/transactions").json() if t["id"] == second["id"])
        self.assertNotIn("billNumber", saved["loanDetails"])
        # A renamed display number is also reserved, independently of the stable ID.
        second["loanDetails"]["billNumber"] = "905"
        self.assertEqual(self.client.post("/api/v1/transactions", json=second).status_code, 200)
        first["loanDetails"]["billNumber"] = "905"
        self.assertEqual(self.client.post("/api/v1/transactions", json=first).status_code, 409)

    def test_creating_existing_bill_does_not_overwrite_it(self):
        payload = self.loan("BILL-906-2026")
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 200)
        payload.update(createOnly=True, amount=12345)
        self.assertEqual(self.client.post("/api/v1/transactions", json=payload).status_code, 409)
        saved = next(t for t in self.client.get("/api/v1/transactions").json() if t["id"] == payload["id"])
        self.assertEqual(saved["amount"], 4200)

    def test_atomic_customer_and_loan_save_commits_once_and_returns_record(self):
        from sqlalchemy.orm import Session
        customer = {"id": "TEST-ATOMIC-CUSTOMER", "name": "Atomic", "phone": "1234567890", "address": "Test"}
        payload = self.loan("TEST-ATOMIC-LOAN")
        payload["customerId"] = customer["id"]
        commits = []
        original_commit = Session.commit
        def commit(db):
            commits.append(True)
            return original_commit(db)
        with patch.object(Session, "commit", new=commit):
            response = self.client.post("/api/v1/records/save", json={"transaction": payload, "customer": customer})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(commits), 1)
        self.assertEqual(response.json()["transaction"]["loanDetails"], payload["loanDetails"])
        self.assertEqual(response.json()["customer"], customer)
        self.assertIn("api;dur=", response.headers["Server-Timing"])
        self.assertTrue(any(c["id"] == customer["id"] for c in self.client.get("/api/v1/customers").json()))

    def test_atomic_failed_commit_leaves_neither_customer_nor_loan(self):
        from sqlalchemy.orm import Session
        customer = {"id": "TEST-ATOMIC-FAILED", "name": "Failed", "phone": "1234567890", "address": "Test"}
        payload = self.loan("TEST-ATOMIC-FAILED-LOAN")
        payload["customerId"] = customer["id"]
        with patch.object(Session, "commit", side_effect=RuntimeError("Commit failed")), patch.object(self.api.browser_ws, "broadcast", new_callable=AsyncMock) as broadcast:
            response = self.client.post("/api/v1/records/save", json={"transaction": payload, "customer": customer})
            self.assertEqual(response.status_code, 500)
            broadcast.assert_not_called()
        self.assertFalse(any(c["id"] == customer["id"] for c in self.client.get("/api/v1/customers").json()))
        self.assertFalse(any(t["id"] == payload["id"] for t in self.client.get("/api/v1/transactions").json()))

    def test_old_edit_cannot_overwrite_newer_data(self):
        payload = self.loan("TEST-CONCURRENT-EDIT")
        original = self.client.post("/api/v1/transactions", json=payload).json()
        newer = dict(original, amount=5000, updateOnly=True, expectedTransaction=original)
        self.assertEqual(self.client.post("/api/v1/records/save", json={"transaction": newer}).status_code, 200)
        stale = dict(original, amount=9000, updateOnly=True, expectedTransaction=original)
        self.assertEqual(self.client.post("/api/v1/records/save", json={"transaction": stale}).status_code, 409)
        saved = next(t for t in self.client.get("/api/v1/transactions").json() if t["id"] == payload["id"])
        self.assertEqual(saved["amount"], 5000)

    def test_edit_cannot_recreate_deleted_loan(self):
        payload = self.loan("TEST-DELETED-EDIT")
        payload["updateOnly"] = True
        self.assertEqual(self.client.post("/api/v1/records/save", json={"transaction": payload}).status_code, 409)

    def test_startup_seeding_preserves_customized_templates(self):
        from backend.app.db.session import SessionLocal
        with SessionLocal() as db:
            self.api.SMSTemplateRepository.save(db, "Thank You", "My customized message")
        with SessionLocal() as db:
            self.api.SMSTemplateRepository.seed_defaults(db, self.api.default_templates)
        templates = self.client.get("/api/v1/sms/templates").json()
        self.assertEqual(next(t["content"] for t in templates if t["name"] == "Thank You"), "My customized message")

    def test_migration_preview_can_disable_daily_reminders(self):
        with patch.dict(os.environ, {"ENABLE_DAILY_REMINDERS": "false"}), patch("threading.Thread") as worker:
            self.api.startup_event()
            worker.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
