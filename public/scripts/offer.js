const qrcode = new QRCode(document.getElementById("qrcode"), document.getElementById("offer").innerText);
const targetNode = qrcode._oDrawing._elImage;
const config = { attributes: true };
const callback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "attributes") {
      if (mutation.attributeName === "src") {
        document.querySelector("#download").href = mutation.target.src;
        document.querySelector("#download").download = "qrcode.png";
      }
    }
  }
}

const observer = new MutationObserver(callback);
observer.observe(targetNode, config);