"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UpdateQuizTitleSchema } from "@/lib/validations";
import { updateQuizTitle } from "@/app/actions/quiz-actions";

interface EditQuizSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  currentTitle: string;
}

export function EditQuizSheet({
  open,
  onOpenChange,
  quizId,
  currentTitle,
}: EditQuizSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof UpdateQuizTitleSchema>>({
    resolver: zodResolver(UpdateQuizTitleSchema),
    defaultValues: {
      title: currentTitle,
    },
  });

  // Ensure the form resets if the currentTitle prop changes
  form.watch((values, { name }) => {
    if (name !== "title" && open) {
      form.reset({ title: currentTitle });
    }
  });

  const onSubmit = async (values: z.infer<typeof UpdateQuizTitleSchema>) => {
    if (values.title === currentTitle) {
      toast.info("No changes were made.");
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateQuizTitle(quizId, values.title);
      toast.success("Quiz updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Quiz Details</SheetTitle>
          <SheetDescription>
            Update your quiz information below. Click save when you&apos;re
            done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 mt-8"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="px-4">
                  <FormLabel>Quiz Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a new quiz name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
