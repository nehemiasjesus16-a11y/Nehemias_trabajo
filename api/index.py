"""Flask API for the Laboratorio Vida queue prototype."""
from datetime import datetime, timezone
from itertools import count
from threading import Lock

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Demo state only. Replace with a persistent database before multi-instance use.
lock = Lock()
sequence = count(1)
queues = []
counters = [{"id": n, "status": "available", "ticket": None} for n in range(1, 5)]


def ticket_view(ticket):
    return {**ticket}


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "laboratorio-vida"})


@app.get("/api/state")
def state():
    with lock:
        waiting = sorted((ticket_view(t) for t in queues if t["status"] == "waiting"), key=lambda t: t["number"])
        serving = [ticket_view(t) for t in queues if t["status"] == "serving"]
        return jsonify({"waiting": waiting, "counters": counters, "serving": serving})


@app.post("/api/tickets")
def create_ticket():
    data = request.get_json(silent=True) or {}
    service = data.get("service", "Estudios de laboratorio")
    with lock:
        number = next(sequence)
        ticket = {
            "id": number,
            "code": f"A{number:02d}",
            "number": number,
            "service": service,
            "status": "waiting",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "counter": None,
        }
        queues.append(ticket)
        return jsonify(ticket_view(ticket)), 201


@app.post("/api/counters/<int:counter_id>/call-next")
def call_next(counter_id):
    with lock:
        counter = next((c for c in counters if c["id"] == counter_id), None)
        if not counter:
            return jsonify({"error": "Ventanilla no encontrada"}), 404
        if counter["status"] == "busy":
            return jsonify({"error": "La ventanilla está ocupada"}), 409
        ticket = next((t for t in queues if t["status"] == "waiting"), None)
        if ticket is None:
            return jsonify({"error": "No hay turnos en espera"}), 404
        ticket["status"] = "serving"
        ticket["counter"] = counter_id
        counter["status"] = "busy"
        counter["ticket"] = ticket["code"]
        return jsonify(ticket_view(ticket))


@app.post("/api/counters/<int:counter_id>/complete")
def complete(counter_id):
    with lock:
        counter = next((c for c in counters if c["id"] == counter_id), None)
        if not counter:
            return jsonify({"error": "Ventanilla no encontrada"}), 404
        ticket = next((t for t in queues if t["code"] == counter["ticket"]), None)
        if ticket:
            ticket["status"] = "completed"
        counter["status"] = "available"
        counter["ticket"] = None
        return jsonify({"ok": True})


@app.post("/api/counters/<int:counter_id>/toggle")
def toggle(counter_id):
    """Allow staff to mark a counter unavailable/available manually."""
    with lock:
        counter = next((c for c in counters if c["id"] == counter_id), None)
        if not counter:
            return jsonify({"error": "Ventanilla no encontrada"}), 404
        if counter["status"] == "busy":
            ticket = next((t for t in queues if t["code"] == counter["ticket"]), None)
            if ticket:
                ticket["status"] = "completed"
            counter["status"] = "available"
            counter["ticket"] = None
            return jsonify({"ok": True})
        counter["status"] = "busy"
        counter["ticket"] = None
        return jsonify(counter)
