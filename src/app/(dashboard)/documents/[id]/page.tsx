import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { DocumentDetailView } from "@/components/documents/document-detail-view";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !document) {
    notFound();
  }

  // Fetch quizzes related to this document
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, mode, question_count, status, created_at")
    .eq("document_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch course info if document belongs to one
  const course = document.course_id
    ? (await supabase
        .from("courses")
        .select("id, title, color, icon")
        .eq("id", document.course_id)
        .single()
      ).data
    : null;

  return (
    <DocumentDetailView
      document={document}
      quizzes={quizzes ?? []}
      course={course}
    />
  );
}
