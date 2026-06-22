from flask import Blueprint, render_template
from middlewares.jwt_middleware import token_required

bp_render_equipments = Blueprint("bp_render_equipments", __name__)

@bp_render_equipments.route("/equipamentos")
@token_required
def render_equipments():
    return render_template("equipments.html")