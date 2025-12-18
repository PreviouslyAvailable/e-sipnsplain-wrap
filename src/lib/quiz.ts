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
  session_started?: boolean; // Whether the host has started the session
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
  used?: boolean; // Whether this question has been opened and closed once
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
    .select("id, code, name, created_at, active_question_id, session_started")
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
    .select("id, room_id, type, prompt, options, order_index, created_at, used")
    .eq("room_id", roomId)
    .order("order_index", { ascending: true });
}

export async function getQuestionById(questionId: string) {
  return supabase
    .from("questions")
    .select("id, room_id, type, prompt, options, order_index, created_at, used")
    .eq("id", questionId)
    .single();
}

export async function setActiveQuestion(roomId: string, questionId: string | null) {
  return supabase
    .from("rooms")
    .update({ active_question_id: questionId })
    .eq("id", roomId);
}

export async function startSession(roomId: string) {
  return supabase
    .from("rooms")
    .update({ session_started: true })
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

export async function clearResponsesForQuestion(questionId: string) {
  return supabase
    .from("responses")
    .delete()
    .eq("question_id", questionId);
}

export async function markQuestionAsUsed(questionId: string) {
  return supabase
    .from("questions")
    .update({ used: true })
    .eq("id", questionId);
}

export async function resetAllQuestions(roomId: string) {
  try {
    // Clear all responses for all questions in the room
    const { data: questions, error: questionsError } = await getQuestions(roomId);
    
    if (questionsError || !questions) {
      console.error('Error loading questions:', questionsError);
      return { 
        data: null, 
        error: questionsError || new Error(`Failed to load questions: ${questionsError?.message || 'Unknown error'}`) 
      };
    }

    if (questions.length === 0) {
      return { data: null, error: new Error('No questions found to reset') };
    }

    // Clear responses for all questions
    const clearPromises = questions.map(q => clearResponsesForQuestion(q.id));
    const clearResults = await Promise.all(clearPromises);
    
    // Check for errors in clearing responses
    const clearErrors = clearResults.filter(r => r.error);
    if (clearErrors.length > 0) {
      console.error('Errors clearing responses:', clearErrors);
      const firstError = clearErrors[0].error;
      if (firstError?.message?.includes('permission') || firstError?.message?.includes('policy')) {
        return {
          data: null,
          error: new Error('Permission denied: Please ensure the DELETE policy exists for the responses table. Run the migration SQL.')
        };
      }
      // Continue anyway - clearing responses is not critical, but log it
    }

    // Reset used flag for all questions
    // Note: If the 'used' column doesn't exist yet, this will fail gracefully
    const updateResult = await supabase
      .from("questions")
      .update({ used: false })
      .eq("room_id", roomId);
    
    if (updateResult.error) {
      const errorMsg = updateResult.error.message || '';
      
      // If the error is about the column not existing, provide a helpful message
      if (errorMsg.includes('column') && (errorMsg.includes('used') || errorMsg.includes('does not exist'))) {
        console.error('The "used" column does not exist. Please run the migration SQL first.');
        return { 
          data: null, 
          error: new Error('Database migration required: Please run the migration SQL to add the "used" column to the questions table. See migration-add-used-to-questions.sql') 
        };
      }
      
      // If permission error
      if (errorMsg.includes('permission') || errorMsg.includes('policy')) {
        return {
          data: null,
          error: new Error('Permission denied: Please ensure UPDATE policy exists for the questions table.')
        };
      }
      
      console.error('Error updating questions:', updateResult.error);
      return { 
        data: null, 
        error: new Error(`Failed to update questions: ${errorMsg}`) 
      };
    }

    return updateResult;
  } catch (err) {
    console.error('Unexpected error in resetAllQuestions:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { 
      data: null, 
      error: new Error(`Unexpected error resetting questions: ${errorMessage}`) 
    };
  }
}
