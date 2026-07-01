from flask import Blueprint, jsonify, request
from services.maintenance_services import MaintenanceService
from middlewares.jwt_middleware import token_required

bp_maintenances = Blueprint("bp_maintenances", __name__)

@bp_maintenances.route("/maintenances", methods=['GET'])
@token_required
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
@token_required
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
    
@bp_maintenances.route("/maintenances", methods=['POST'])
# @token_required
def create_maintenance():
    try:
        data = request.get_json()

        created_maintenance = MaintenanceService.create_maintenance(data)

        return jsonify(created_maintenance), 201
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500