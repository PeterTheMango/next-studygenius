"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmActionSchema } from "@/lib/validations"

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  actionLabel: string
  onConfirm: () => Promise<void>
  isLoading: boolean
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onConfirm,
  isLoading,
}: ConfirmActionDialogProps) {
  const form = useForm({
    resolver: zodResolver(ConfirmActionSchema),
    defaultValues: {
      confirmText: "",
    },
  })

  const onSubmit = async () => {
    await onConfirm()
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <AlertDescription>
            This action is irreversible. Please type "confirm action" below to proceed.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmText"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Type 'confirm action'"
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? "Processing..." : actionLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
