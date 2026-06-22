from flask import Blueprint, request, jsonify
from services.auth_services import AuthService

bp_auth = Blueprint("bp_auth", __name__)

@bp_auth.route("/login", methods=['POST'])
def user_login():
    try:
        data = request.get_json()

        token = AuthService.login(data)

        response = jsonify({
            "message": "Login realizado com sucesso"
        })

        response.set_cookie(
            'token',
            token,
            httponly=True,
            samesite='Lax',
            secure=False,
            max_age=2 * 60 * 60
        )

        return response, 200
    except ValueError as e:
        return jsonify({
            "message": str(e)
        }), 401

    except Exception as e:
        return jsonify({
            "message": str(e)
        }), 500