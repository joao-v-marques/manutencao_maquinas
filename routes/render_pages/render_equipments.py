from flask import Blueprint, render_template

bp_render_equipments = Blueprint("bp_render_equipments", __name__)

@bp_render_equipments.route("/equipamentos")
def render_equipments():
    return render_template("equipments.html")