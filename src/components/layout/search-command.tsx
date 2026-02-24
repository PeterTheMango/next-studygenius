"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  FileText,
  BrainCircuit,
  BookOpen,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
}

interface SearchResults {
  documents: SearchResult[];
  quizzes: SearchResult[];
  courses: SearchResult[];
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults>({
    documents: [],
    quizzes: [],
    courses: [],
  });
  const [isMac, setIsMac] = React.useState(true);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setIsMac(navigator.userAgent.includes("Mac"));
  }, []);

  // Cmd+K / Ctrl+K listener
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || (e.ctrlKey && !isMac))) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults({ documents: [], quizzes: [], courses: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const searchTerm = `%${query.trim()}%`;

      const [docsRes, quizzesRes, coursesRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, file_name")
          .ilike("file_name", searchTerm)
          .limit(5),
        supabase
          .from("quizzes")
          .select("id, title")
          .ilike("title", searchTerm)
          .limit(5),
        supabase
          .from("courses")
          .select("id, title, course_code")
          .or(`title.ilike.${searchTerm},course_code.ilike.${searchTerm}`)
          .limit(5),
      ]);

      setResults({
        documents: (docsRes.data ?? []).map((d) => ({
          id: d.id,
          title: d.file_name,
        })),
        quizzes: (quizzesRes.data ?? []).map((q) => ({
          id: q.id,
          title: q.title,
        })),
        courses: (coursesRes.data ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: c.course_code,
        })),
      });

      setLoading(false);
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (type: string, id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/${type}/${id}`);
  };

  const hasResults =
    results.documents.length > 0 ||
    results.quizzes.length > 0 ||
    results.courses.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-sm"
        type="button"
      >
        <InputGroup className="cursor-pointer hover:border-ring/50 transition-colors">
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search anything..."
            readOnly
            className="cursor-pointer"
            tabIndex={-1}
          />
          <InputGroupAddon align="inline-end">
            <Kbd>{isMac ? "⌘" : "Ctrl + "}K</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setQuery("");
          }
        }}
        title="Search"
        description="Search for documents, quizzes, or courses"
      >
        <CommandInput
          placeholder="Search documents, quizzes, or courses..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          )}

          {!loading && !query.trim() && (
            <CommandEmpty>Start typing to search...</CommandEmpty>
          )}

          {!loading && query.trim() && !hasResults && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!loading && results.documents.length > 0 && (
            <CommandGroup heading="Documents">
              {results.documents.map((doc) => (
                <CommandItem
                  key={doc.id}
                  value={`doc-${doc.id}-${doc.title}`}
                  onSelect={() => handleSelect("documents", doc.id)}
                >
                  <FileText className="text-blue-500" />
                  <span className="truncate">{doc.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading &&
            results.documents.length > 0 &&
            results.quizzes.length > 0 && <CommandSeparator />}

          {!loading && results.quizzes.length > 0 && (
            <CommandGroup heading="Quizzes">
              {results.quizzes.map((quiz) => (
                <CommandItem
                  key={quiz.id}
                  value={`quiz-${quiz.id}-${quiz.title}`}
                  onSelect={() => handleSelect("quizzes", quiz.id)}
                >
                  <BrainCircuit className="text-purple-500" />
                  <span className="truncate">{quiz.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading &&
            (results.documents.length > 0 || results.quizzes.length > 0) &&
            results.courses.length > 0 && <CommandSeparator />}

          {!loading && results.courses.length > 0 && (
            <CommandGroup heading="Courses">
              {results.courses.map((course) => (
                <CommandItem
                  key={course.id}
                  value={`course-${course.id}-${course.title}`}
                  onSelect={() => handleSelect("courses", course.id)}
                >
                  <BookOpen className="text-emerald-500" />
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{course.title}</span>
                    {course.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {course.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
