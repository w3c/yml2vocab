function remove_status_remark() {
    const sotd = document.getElementById("sotd");
    const p = sotd.getElementsByTagName('p')[0];
    sotd.removeChild(p);
}
