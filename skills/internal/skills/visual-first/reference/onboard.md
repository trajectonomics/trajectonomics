# Onboard

Design a first run and its empty states so that a new person sees an answer before reading anything.

## Steps

1. **Show an answer at once.** Before the person has data of their own, the screen shows its picture with example figures and a one-line note that they are an example, as the hosted Demo does. A screen that shows only an empty box teaches nothing.
2. **Give each empty state its own size:**

   | Empty because | Show |
   |---|---|
   | first use | a faint version of the picture it will become, one label and one primary action |
   | the person cleared it | one label |
   | a filter found nothing | one label and a "Clear filter" action |
   | something failed | the error, written as clarify says, and "Try again" |

   OpenJot's `EmptyMonthArt` is the model: a picture where the data will be.
3. **Teach at the moment of use.** One hint, placed beside the control it explains, dismissible and shown once. A first run has no tour and no paragraph.
4. **Name the first step by its outcome** ("Add your salary"), and make it the screen's one primary action.

## Done when

Every first-run and empty state of the screen is listed with its picture, its label and its action. A new person can reach the screen's answer without a tour.
