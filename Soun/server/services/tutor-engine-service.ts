const PYTHON_TUTOR_URL =
  process.env.PYTHON_TUTOR_URL || "http://127.0.0.1:8000";

export async function askTutor(question: string) {
  const response = await fetch(`${PYTHON_TUTOR_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`Python tutor /ask failed: ${response.status}`);
  }

  return response.json();
}

export async function gradeTutor(check_question: string, student_answer: string) {
  const response = await fetch(`${PYTHON_TUTOR_URL}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_question, student_answer }),
  });

  if (!response.ok) {
    throw new Error(`Python tutor /grade failed: ${response.status}`);
  }

  return response.json();
}

export async function getTutorProgress() {
  const response = await fetch(`${PYTHON_TUTOR_URL}/progress`);

  if (!response.ok) {
    throw new Error(`Python tutor /progress failed: ${response.status}`);
  }

  return response.json();
}

export async function startTutorSession() {
  const baseUrl = process.env.PYTHON_TUTOR_URL || "http://127.0.0.1:8000";
  console.log("PYTHON_TUTOR_URL:", baseUrl);

  const response = await fetch(`${baseUrl}/start-session`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Python tutor /start-session failed: ${response.status}`);
  }

  return await response.json();
}

export async function getTutorProgressDashboard() {
  const baseUrl = process.env.PYTHON_TUTOR_URL || "http://127.0.0.1:8000";

  const response = await fetch(`${baseUrl}/progress-dashboard`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Python tutor /progress-dashboard failed: ${response.status}`);
  }

  return await response.json();
}