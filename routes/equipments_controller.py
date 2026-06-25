from flask import Blueprint, jsonify
from services.equipments_services import EquipmentsService

bp_equipments = Blueprint("bp_equipments", __name__)

@bp_equipments.route("/equipments", methods=['GET'])
def get_all():
    try:
        equipments = EquipmentsService.get_all()

        return jsonify([
            equipment.to_dict()
            for equipment in equipments
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        })