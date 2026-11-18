def test_api_docs_available_in_development(make_client):
    client = make_client("development")

    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").status_code == 200


def test_api_docs_hidden_in_production(make_client):
    client = make_client("production")

    assert client.get("/api/docs").status_code == 404
    assert client.get("/api/openapi.json").status_code == 404
    # The API itself still works.
    assert client.get("/api/health").status_code == 200
