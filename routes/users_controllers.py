from flask import Blueprint, jsonify, request
from services.users_services import UsersService
from middlewares.jwt_middleware import token_required
from middlewares.permissions import role_required

bp_users = Blueprint("bp_users", __name__)

@bp_users.route("/users", methods=['GET'])
@token_required
@role_required("administrator")
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
        }), 500

@bp_users.route("/users", methods=['POST'])
@token_required
@role_required("administrator")
def create_user():
    try:
        data = request.get_json()

        created_user = UsersService.create_user(data)

        return created_user, 201
    except ValueError as e:
        return jsonify({
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

@bp_users.route("/users/<int:user_id>", methods=['DELETE'])
@token_required
@role_required("administrator")
def delete_user(user_id):
    try:
        # impede que o administrador exclua a própria conta e perca o acesso ao sistema
        if request.user.get("id") == user_id:
            return jsonify({
                "message": "Você não pode excluir o seu próprio usuário"
            }), 400

        UsersService.delete_user(user_id)

        return jsonify({
            "message": "Usuário deletado com sucesso!"
        }), 200
    except ValueError as e:
        return jsonify({
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500

@bp_users.route("/users/<int:id>", methods=['PUT'])
@token_required
@role_required("administrator")
def update_user(id):
    try:
        data = request.get_json()

        updated_user = UsersService.update_user(id, data)

        return updated_user
    except ValueError as e:
        return jsonify({
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500
