const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("input");

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
scrollToBottom();

function appendMessage(role, content) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg-${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = characterAvatar;
    wrap.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = content;
  wrap.appendChild(bubble);

  messagesEl.appendChild(wrap);
  scrollToBottom();
  return bubble;
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  appendMessage("user", text);
  input.value = "";
  input.style.height = "auto";

  const typingBubble = appendMessage("assistant", "...");
  typingBubble.classList.add("typing");

  try {
    const res = await fetch(`/chat/${characterId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    typingBubble.classList.remove("typing");
    if (!res.ok) {
      typingBubble.textContent = `[error] ${data.error || "something broke"}`;
      typingBubble.parentElement.classList.add("msg-error");
    } else {
      typingBubble.textContent = data.reply;
    }
  } catch (err) {
    typingBubble.classList.remove("typing");
    typingBubble.textContent = `[error] ${err.message}`;
    typingBubble.parentElement.classList.add("msg-error");
  }
  scrollToBottom();
});
