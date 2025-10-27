import * as React from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface BetaBlockerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BetaBlockerModal({ isOpen, onClose }: BetaBlockerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <h2 className="text-lg font-semibold">Beta Access</h2>
          <p className="text-sm text-muted-foreground">
            The beta is currently not open to a large number of requests.
          </p>
          <p className="text-sm text-muted-foreground">
            If you wish to test Bleak AI, please write an email to{' '}
            <a
              href="mailto:info@bleakai.com"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              info@bleakai.com
            </a>
          </p>
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}