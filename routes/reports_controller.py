from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
from services.reports_services import ReportsService
from middlewares.jwt_middleware import token_required

bp_reports = Blueprint("bp_reports", __name__)

@bp_reports.route("/reports/equipments", methods=['GET'])
@token_required
def get_equipments_report():
    try:
        user_role = request.user["role_description"]
        user_maintenance_group_id = request.user["maintenance_group_id"]

        file_stream = ReportsService.generate_equipments_report(user_role, user_maintenance_group_id)

        filename = f"relatorio_equipamentos_{datetime.now().strftime('%d-%m-%Y')}.xlsx"

        return send_file(
            file_stream,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500
