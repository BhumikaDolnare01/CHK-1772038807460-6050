const API = "http://localhost:5000/api";

async function initiatePayment() {
  const name  = document.getElementById("name-input")?.value?.trim();
  const email = document.getElementById("email-input")?.value?.trim();

  if (!name || !email) {
    alert("Please enter your name and email.");
    return;
  }

  try {
    // Create order
    const res  = await fetch(API + "/create-razorpay-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Open Razorpay checkout
    const options = {
      key:         "rzp_test_SNErPgymZXw918",   // ← your real key
      amount:      data.amount,
      currency:    data.currency,
      name:        "Prepwise",
      description: "Lifetime Premium Access",
      order_id:    data.orderId,
      prefill: { name, email },
      theme: { color: "#c9a84c" },
      handler: async function(response) {
        // Verify payment
        try {
          const verifyRes = await fetch(API + "/verify-payment", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyData.success) throw new Error(verifyData.message);

          alert("🎉 Payment Successful! Welcome to Prepwise Premium.\nPayment ID: " + response.razorpay_payment_id);
          window.location.href = "index.html";

        } catch (err) {
          alert("Payment verification failed: " + err.message);
        }
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function(response) {
      alert("Oops! Payment failed.\n" + response.error.description);
    });
    rzp.open();

  } catch (err) {
    alert("Payment init failed: " + err.message);
  }
}
