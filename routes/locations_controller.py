from flask import Blueprint, jsonify
from services.locations_services import LocationService

bp_locations = Blueprint("bp_locations", __name__)

@bp_locations.route("/locations", methods=['GET'])
def get_all():
    try:
        locations = LocationService.get_all()

        return jsonify([
            location.to_dict()
            for location in locations
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        })