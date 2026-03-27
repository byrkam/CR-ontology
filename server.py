from flask import Flask, request, jsonify
from flask_cors import CORS
from rdflib import Graph
import tempfile
import os

app = Flask(__name__)
CORS(app)

FORMAT_MAP = {
    ".owl": "xml",
    ".rdf": "xml",
    ".xml": "xml",
    ".ttl": "turtle",
    ".nt": "nt",
}


def guess_format(filename: str) -> str | None:
    filename = filename.lower()
    for ext, fmt in FORMAT_MAP.items():
        if filename.endswith(ext):
            return fmt
    return None


@app.post("/query")
def query_ontology():
    if "ontology" not in request.files:
        return jsonify({"error": "No ontology file uploaded."}), 400

    ontology_file = request.files["ontology"]
    query = request.form.get("query", "").strip()

    if not query:
        return jsonify({"error": "No SPARQL query provided."}), 400

    suffix = os.path.splitext(ontology_file.filename)[1].lower()
    rdf_format = guess_format(ontology_file.filename)

    if rdf_format is None:
        return jsonify({"error": f"Unsupported file type: {suffix or 'unknown'}"}), 400

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            ontology_file.save(tmp.name)
            tmp_path = tmp.name

        graph = Graph()
        graph.parse(tmp_path, format=rdf_format)

        results = graph.query(query)

        columns = [str(var) for var in results.vars]
        rows = []

        for row in results:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                row_dict[col] = str(value) if value is not None else ""
            rows.append(row_dict)

        return jsonify({
            "columns": columns,
            "rows": rows,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)