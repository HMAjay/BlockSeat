// TransferTicket executes buyer lookup, capped resale, and transfer call.
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function TransferTicket() {
  const { tokenId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [recipientBstId, setRecipientBstId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [resalePrice, setResalePrice] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadTicket = async () => {
      const { data } = await api.get("/tickets");
      const current = data.find((t) => String(t.tokenId) === String(tokenId));
      setTicket(current || null);
    };
    loadTicket().catch(() => setMessage("Failed to load ticket"));
  }, [tokenId]);

  const lookupUser = async () => {
    try {
      const { data } = await api.get(`/users/lookup/${recipientBstId}`);
      setRecipientName(data.name);
    } catch (error) {
      setMessage(error.response?.data?.message || "Recipient lookup failed");
    }
  };

  const payAndTransfer = async () => {
    try {
      if (!ticket) return setMessage("Ticket not found");
      if (Number(resalePrice) > ticket.maxResalePrice) return setMessage("Price exceeds cap");

      const orderResp = await api.post("/transfer/create-order", { tokenId: Number(tokenId), resalePrice: Number(resalePrice) });
      const order = orderResp.data.order;

      const loaded = await loadRazorpay();
      if (!loaded) return setMessage("Unable to load Razorpay SDK");

      const options = {
        key: orderResp.data.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BlockSeat",
        description: `Transfer Token #${tokenId}`,
        order_id: order.id,
        handler: async (response) => {
          await api.post("/transfer/execute", {
            tokenId: Number(tokenId),
            recipientBstId,
            resalePrice: Number(resalePrice),
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          setMessage(`Ticket transferred to ${recipientName}`);
        }
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (error) {
      setMessage(error.response?.data?.message || "Transfer failed");
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", fontFamily: "Arial" }}>
      <h2>Transfer Ticket #{tokenId}</h2>
      <p>Max resale cap: Rs. {ticket?.maxResalePrice ?? "-"}</p>

      <input
        value={recipientBstId}
        onChange={(e) => setRecipientBstId(e.target.value)}
        placeholder="Recipient BST ID"
        style={{ width: "100%", padding: 10, marginBottom: 8 }}
      />
      <button onClick={lookupUser}>Lookup User</button>
      {recipientName && <p>Recipient: {recipientName}</p>}

      <input
        type="number"
        value={resalePrice}
        onChange={(e) => setResalePrice(e.target.value)}
        placeholder="Resale price in INR"
        style={{ width: "100%", padding: 10, margin: "12px 0" }}
      />
      <button onClick={payAndTransfer}>Pay & Transfer</button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

export default TransferTicket;
