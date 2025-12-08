import { createClient } from "@/lib/supabase/server";
import { QuizBuilder } from "@/components/quiz/quiz-builder";
import { notFound, redirect } from "next/navigation";

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

  return (
    <div className="container mx-auto py-8">
      <QuizBuilder documentId={document.id} documentTitle={document.file_name} />
    </div>
  );
}
