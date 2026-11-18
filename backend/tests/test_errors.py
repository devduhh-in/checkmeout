from fastapi import APIRouter
from pydantic import BaseModel

from app.core.errors import AppError


def _add_test_routes(app):
    router = APIRouter()

    class Payload(BaseModel):
        name: str
        age: int

    @router.post("/api/_test/validate")
    def validate(payload: Payload):
        return payload

    @router.get("/api/_test/app-error")
    def app_error():
        raise AppError("limit_reached", "You have reached your plan limit.", status_code=403)

    @router.get("/api/_test/crash")
    def crash():
        raise RuntimeError("database password is hunter2 at /srv/app/secret.py")

    app.include_router(router)


def test_unknown_route_uses_standard_format(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Not Found."}}


def test_wrong_method_uses_standard_format(client):
    response = client.post("/api/health")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_validation_error_lists_fields(client):
    _add_test_routes(client.app)

    response = client.post("/api/_test/validate", json={"name": "Priya", "age": "old"})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Some fields are invalid."
    assert body["error"]["details"][0]["field"] == "body.age"


def test_app_error_is_returned_as_is(client):
    _add_test_routes(client.app)

    response = client.get("/api/_test/app-error")

    assert response.status_code == 403
    assert response.json() == {
        "error": {"code": "limit_reached", "message": "You have reached your plan limit."}
    }


def test_unexpected_error_hides_internal_details(client):
    _add_test_routes(client.app)

    response = client.get("/api/_test/crash")

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "Something went wrong. Please try again."}
    }
    assert "hunter2" not in response.text
    assert "secret.py" not in response.text
