import { supabase } from "@/lib/supabaseClient";

export type TimelinePosition = {
  month: string | null;
  scrollPosition: number;
  activeMomentId: string | null;
};

export type Room = {
  id: string;
  code: string;
  name: string | null;
  created_at: string;
  active_question_id: string | null;
  timeline_position?: TimelinePosition | null;
};

export type Question = {
  id: string;
  room_id: string;
  type: "mcq" | "text" | "scale";
  prompt: string;
  options: string[] | { left: string; right: string } | null; // string[] for mcq, { left, right } for scale
  order_index: number;
  created_at: string;
};

export type ResponseRow = {
  id: string;
  question_id: string;
  session_id: string;
  value: string | number;
  created_at: string;
};

export async function getRoomByCode(code: string) {
  const result = await supabase
    .from("rooms")
    .select("id, code, name, created_at, active_question_id")
    .eq("code", code)
    .single();
  
  // Log detailed error information for debugging
  if (result.error) {
    console.error('Supabase query error:', {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
    });
  }
  
  return result;
}

export async function getQuestions(roomId: string) {
  return supabase
    .from("questions")
    .select("id, room_id, type, prompt, options, order_index, created_at")
    .eq("room_id", roomId)
    .order("order_index", { ascending: true });
}

export async function getQuestionById(questionId: string) {
  return supabase
    .from("questions")
    .select("id, room_id, type, prompt, options, order_index, created_at")
    .eq("id", questionId)
    .single();
}

export async function setActiveQuestion(roomId: string, questionId: string | null) {
  return supabase
    .from("rooms")
    .update({ active_question_id: questionId })
    .eq("id", roomId);
}

export function subscribeToRoom(roomId: string, callback: (room: Room) => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => callback(payload.new as Room)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function submitResponse(params: {
  questionId: string;
  sessionId: string;
  value: string | number;
}) {
  const { questionId, sessionId, value } = params;
  
  // First, get the question to retrieve room_id
  const { data: question, error: questionError } = await getQuestionById(questionId);
  
  if (questionError || !question) {
    return { data: null, error: questionError || new Error('Question not found') };
  }
  
  // Insert response with room_id
  // Note: Database column is 'answer', not 'value'
  const result = await supabase.from("responses").insert([
    { 
      room_id: question.room_id,
      question_id: questionId, 
      session_id: sessionId, 
      answer: String(value) // Database column is 'answer'
    },
  ]);
  
  // Log detailed error information for debugging
  if (result.error) {
    console.error('Supabase insert error:', {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
      fullError: result.error,
    });
  }
  
  return result;
}

export async function getResponses(questionId: string) {
  const result = await supabase
    .from("responses")
    .select("id, question_id, session_id, answer, created_at")
    .eq("question_id", questionId);
  
  // Map 'answer' column to 'value' for consistency with frontend
  if (result.data) {
    result.data = result.data.map((row: any) => ({
      ...row,
      value: row.answer,
    }));
  }
  
  return result;
}

export function subscribeToResponses(
  questionId: string,
  callback: (response: ResponseRow) => void
) {
  const channel = supabase
    .channel(`responses:${questionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "responses",
        filter: `question_id=eq.${questionId}`,
      },
      (payload) => {
        // Map 'answer' column to 'value' for consistency
        const response = payload.new as any;
        const mappedResponse = {
          ...response,
          value: response.answer || response.value, // Support both column names
        } as ResponseRow;
        callback(mappedResponse);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
