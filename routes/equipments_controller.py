from flask import Blueprint, jsonify, request
from services.equipments_services import EquipmentsService
from middlewares.jwt_middleware import token_required

bp_equipments = Blueprint("bp_equipments", __name__)

@bp_equipments.route("/equipments", methods=['GET'])
# @token_required
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
        }), 500

# FAZER O ROUTE DE POST DOS EQUIPMENTS
@bp_equipments.route("/equipments", methods=['POST'])
@token_required
def create_equipment():
    try:
        data = request.get_json()

        created_equipment = EquipmentsService.create_equipment(data)

        return created_equipment
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500