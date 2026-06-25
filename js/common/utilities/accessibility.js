function announceText(holderId, message) {
  const holder = document.getElementById(holderId);

  holder.textContent = ''; // We first clear to ensure it can be announced multiple times

  setTimeout(() => {
    holder.textContent = message; // Setting a timeout ensure the message can get announced after more critical things
  }, 100);
}

export function announceStatus(message) {
  announceText('status-announcement', message);
}

export function announceError(message) {
  announceText('error-announcement', message);
}