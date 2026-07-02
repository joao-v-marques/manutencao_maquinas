from flask import Blueprint, jsonify, request
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
    
@bp_users.route("/users", methods=['POST'])
def create_user():
    try:
        data = request.get_json()

        created_user = UsersService.create_user(data)

        return created_user
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

@bp_users.route("/users/<int:user_id>", methods=['DELETE'])
def delete_user(user_id):
    try:
        UsersService.delete_user(user_id)

        return jsonify({
            "message": "Usuário deletado com sucesso!"
        }), 200
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

@bp_users.route("/users/<int:id>", methods=['PUT'])
def update_user(id):
    try:
        data = request.get_json()

        updated_user = UsersService.update_user(id, data)

        return updated_user
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500