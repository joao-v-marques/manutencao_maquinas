from flask import Blueprint, render_template

bp_render_login = Blueprint("bp_render_login", __name__)

@bp_render_login.route("/login")
def render_login():
    return render_template("login.html")