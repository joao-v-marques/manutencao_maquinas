from flask import Blueprint, render_template

bp_render_maintenance = Blueprint("bp_render_maintenance", __name__)

@bp_render_maintenance.route("/manutencao", methods=['GET'])
def render_maintenance():
    return render_template("maintenance.html")