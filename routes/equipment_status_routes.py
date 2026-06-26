from flask import Blueprint, jsonify
from services.equipment_status_services import EquipmentStatusService

bp_equipment_status = Blueprint("bp_equipment_status", __name__)

@bp_equipment_status.route("/equipment-status", methods=['GET'])
def get_all():
    try:
        equipment_status = EquipmentStatusService.get_all()

        return jsonify([
            status.to_dict()
            for status in equipment_status
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500