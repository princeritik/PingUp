import { Inngest, step } from "inngest";
import User from "../models/user.model.js";
import Connection from "../models/connection.model.js";
import sendEmail from "../configs/nodeMailer.js";
import Story from "../models/story.model.js";
import Message from "../models/message.model.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-app" });

//inngest function to save user data in  database
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    let username = email_addresses[0].email_address.split("@")[0];

    //check availability of username
    const user = await User.findOne({ username });
    if (user) {
      username = username + Math.floor(Math.random() * 10000);
    }

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      profile_picture: image_url,
      username,
    };
    await User.create(userData);
  },
);

//inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const updatedUserData = {
      email: email_addresses[0].email_address,
      full_name: first_name + " " + last_name,
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate(id, updatedUserData);
  },
);

//inngest function to delete user data from database
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event }) => {
    const { id } = event.data;

    await User.findByIdAndDelete(id);
  },
);

//inngest function to send remainder when a new connection request is added
const sendNewConnectionRequestReminder = inngest.createFunction(
  {
    id: "send-new-connection-request-reminder",
    triggers: [{ event: "app/connection-request" }],
  },

  async ({ event, step }) => {
    const { connectionId } = event.data;

    // 1. Send initial email immediately
    await step.run("send-connection-request-mail", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id",
      );

      if (!connection) {
        return {
          message: "Connection request not found",
        };
      }

      if (!connection.from_user_id || !connection.to_user_id) {
        return {
          message: "Sender or receiver not found",
        };
      }

      const subject = "👋 New Connection Request";

      const body = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">

          <h2>
            Hi ${connection.to_user_id.full_name},
          </h2>

          <p>
            You have a new connection request from
            <strong>${connection.from_user_id.full_name}</strong>
            - @${connection.from_user_id.username}
          </p>

          <p>
            Click
            <a
              href="${process.env.FRONTEND_URL}/connections"
              style="color: #10b981;"
            >
              here
            </a>
            to accept or reject the request.
          </p>

          <br/>

          <p>
            Thanks,<br/>
            PingUp - Stay Connected
          </p>

        </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });

      return {
        message: "Initial connection email sent",
      };
    });

    // 2. Wait 24 hours
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await step.sleepUntil("wait-for-24-hours", in24Hours);

    // 3. Check again and send reminder
    await step.run(
      "send-connection-request-reminder",

      async () => {
        const connection = await Connection.findById(connectionId).populate(
          "from_user_id to_user_id",
        );

        if (!connection) {
          return {
            message: "Connection request no longer exists",
          };
        }

        if (connection.status !== "pending") {
          return {
            message: "Connection request is no longer pending",
          };
        }

        if (!connection.from_user_id || !connection.to_user_id) {
          return {
            message: "Sender or receiver not found",
          };
        }

        const subject = "⏰ Reminder: Pending Connection Request";

        const body = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">

            <h2>
              Hi ${connection.to_user_id.full_name},
            </h2>

            <p>
              This is a reminder that
              <strong>${connection.from_user_id.full_name}</strong>
              - @${connection.from_user_id.username}
              sent you a connection request.
            </p>

            <p>
              Click
              <a
                href="${process.env.FRONTEND_URL}/connections"
                style="color: #10b981;"
              >
                here
              </a>
              to view the request.
            </p>

            <br/>

            <p>
              Thanks,<br/>
              PingUp - Stay Connected
            </p>

          </div>
        `;

        await sendEmail({
          to: connection.to_user_id.email,
          subject,
          body,
        });

        return {
          message: "Reminder sent",
        };
      },
    );

    return {
      success: true,
    };
  },
);

//inngest fucntion to delete story after 24 hours
const deleteStory = inngest.createFunction(
  {
    id: "story-delete",
    triggers: [{ event: "app/story.delete" }],
  },

  async ({ event, step }) => {
    const { storyId } = event.data;
    const in24hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-for-24-hours", in24hours);
    await step.run("delete-story", async () => {
      await Story.findByIdAndDelete(storyId);
      return { message: "Story deleted" };
    });
  },
);

const sendNotificationOfUnseenMessages =
  inngest.createFunction(
    {
      id: "send-unseen-messages-notification",

      triggers: [
        {
          cron: "TZ=America/New_York 0 9 * * *",
        },
      ],
    },

    async ({ step }) => {

      // 1. Get all unseen messages
      const messages = await step.run(
        "get-unseen-messages",
        async () => {
          return await Message.find({
            seen: false,
          }).populate("to_user_id");
        }
      );


      // 2. Count unseen messages per user
      const unseenCount = {};

      messages.forEach((message) => {

        // receiver might have been deleted
        if (!message.to_user_id) return;

        const userId =
          message.to_user_id._id.toString();

        unseenCount[userId] =
          (unseenCount[userId] || 0) + 1;
      });


      // 3. Send one email per user
      for (const userId in unseenCount) {

        await step.run(
          `send-unseen-email-${userId}`,

          async () => {
            const user = await User.findById(userId);

            if (!user) {
              return {
                message: "User not found",
              };
            }


            const subject =
              `📩 You have ${unseenCount[userId]} unseen messages`;


            const body = `
              <div
                style="
                  font-family: Arial, sans-serif;
                  padding: 20px;
                "
              >

                <h2>
                  Hi ${user.full_name},
                </h2>

                <p>
                  You have
                  <strong>
                    ${unseenCount[userId]}
                  </strong>
                  unseen messages.
                </p>

                <p>
                  Click
                  <a
                    href="${process.env.FRONTEND_URL}/messages"
                    style="color: #10b981;"
                  >
                    here
                  </a>
                  to view them.
                </p>

                <br/>

                <p>
                  Thanks,<br/>
                  PingUp - Stay Connected
                </p>

              </div>
            `;


            await sendEmail({
              to: user.email,
              subject,
              body,
            });


            return {
              message: `Notification sent to ${userId}`,
            };
          }
        );
      }


      return {
        message: "Notifications sent.",
      };
    }
  );

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  sendNewConnectionRequestReminder,
  deleteStory,
  sendNotificationOfUnseenMessages,
];
