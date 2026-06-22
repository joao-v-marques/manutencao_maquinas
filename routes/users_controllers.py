from flask import Blueprint, jsonify
from services.users_services import UsersService

bp_users = Blueprint("bp_users", __name__)

@bp_users.route("/users", methods=['GET'])
def get_all():
    try:
        users = UsersService.get_all()

        return jsonify([
            user.to_dict()
            for user in users
        ])
    except Exception as e:
        return jsonify({
            "message": str(e)
        })