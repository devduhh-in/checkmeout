/**
 * The props every overlay accepts so it can be used two ways:
 *  - declaratively:  <Drawer open={open} onOpenChange={setOpen} …/>
 *  - through the controller: modal.open((controls) => <Drawer {...controls} …/>)
 */
export interface OverlayControlProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the closing animation finishes and the overlay is gone. */
  onExited?: () => void;
}
