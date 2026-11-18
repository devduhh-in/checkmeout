def test_health_reports_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "CheckMeOut API", "version": "0.1.0"}


def test_health_is_only_served_under_api_prefix(client):
    assert client.get("/health").status_code == 404
