from flask import Blueprint, jsonify
from services.maintenance_services import MaintenanceService

bp_maintenances = Blueprint("bp_maintenances", __name__)

@bp_maintenances.route("/maintenances", methods=['GET'])
def get_all():
    try:
        maintenances = MaintenanceService.get_all()

        return jsonify([
            maintenance.to_dict()
            for maintenance in maintenances
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500
    
@bp_maintenances.route("/maintenances/<int:id>", methods=['GET'])
def get_by_id(id):
    try:
        maintenances = MaintenanceService.get_by_id(id)

        return jsonify([
            maintenance.to_dict()
            for maintenance in maintenances
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500