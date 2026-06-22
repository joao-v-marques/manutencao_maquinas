from flask import Blueprint, render_template

bp_render_dashboard = Blueprint("bp_render_dashboard", __name__)

@bp_render_dashboard.route("/dashboard")
def render_login():
    return render_template("dashboard.html")