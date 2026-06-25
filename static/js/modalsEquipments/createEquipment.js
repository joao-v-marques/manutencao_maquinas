const modalCreatEquipment = document.getElementById("formModalOverlay");

const btnCreateEquipment = document.getElementById("formModalTitle");

export function openModal() {
    console.log("O modal abriu");
    modalCreatEquipment.classList.add("is-open");
}
