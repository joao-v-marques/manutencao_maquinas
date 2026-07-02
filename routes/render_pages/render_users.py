from flask import Blueprint, render_template

bp_render_users = Blueprint("bp_render_users", __name__)

@bp_render_users.route("/usuarios", methods=['GET'])
def render_users():
    return render_template("users.html")