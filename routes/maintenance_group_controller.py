from flask import Blueprint, jsonify
from services.maintenance_group_service import MaintenanceService

bp_maintenance_group = Blueprint("bp_maintenance_group", __name__)

@bp_maintenance_group.route("/maintenance-groups", methods=['GET'])
def get_all():
    try:
        maintenance_groups = MaintenanceService.get_all()

        return jsonify([
            maintenance_group.to_dict()
            for maintenance_group in maintenance_groups
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        })