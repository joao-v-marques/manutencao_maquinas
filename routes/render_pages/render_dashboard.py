from flask import Blueprint, render_template
from middlewares.jwt_middleware import token_required

bp_render_dashboard = Blueprint("bp_render_dashboard", __name__)

@bp_render_dashboard.route("/dashboard")
@token_required
def render_login():
    return render_template("dashboard.html")