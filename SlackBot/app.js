'use strict';
const { App } = require('@slack/bolt');
const { MongoClient } = require("mongodb");
const express = require('express');
const app = express();
require("dotenv").config();

const slack = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true
});

const uri = process.env.MongoUri;

let collection;

const mongoClient = new MongoClient(uri);

// Slack command /bot start ____________________________________________
let model = {
    mood: undefined,
    hobbies: [],
    username: undefined,
    teamId: undefined,
    appId: undefined,
    command: undefined,
    message: undefined
};

let response = Object.create(model)

slack.command('/bot',
    async ({ ack, body, say }) => {

        try {
            await ack();
            switch (body.text) {
            case "hello":
                await say({
                    "blocks": [
                        {
                            "type": "divider"
                        },
                        {
                            "type": "input",
                            "element": {
                                "type": "static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select mood",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Doing Well",
                                            "emoji": true
                                        },
                                        "value": "Doing Well"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Neutral",
                                            "emoji": true
                                        },
                                        "value": "Neutral"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Feeling Lucky",
                                            "emoji": true
                                        },
                                        "value": "Feeling Lucky"
                                    }
                                ],
                                "action_id": "selectMood"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Welcome. How are you doing?",
                                "emoji": true
                            }
                        }
                    ]
                })
                response.command = body.command;
                response.message = body.text;
                break;

            default:
                await say("Invalid command");
                break;
            }
        } catch (e) {
            console.log(e);
        }
    });

slack.action('selectMood',
    async ({ ack, body, say }) => {

        try {
            await ack();

            if (response.command !== undefined && response.command.length > 0) {
                await say({
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "What are your favorite hobbies"
                            },
                            "accessory": {
                                "type": "multi_static_select",
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Select hobbies",
                                    "emoji": true
                                },
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Football",
                                            "emoji": true
                                        },
                                        "value": "Football"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Music",
                                            "emoji": true
                                        },
                                        "value": "Music"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Sleep",
                                            "emoji": true
                                        },
                                        "value": "Sleep"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Movies",
                                            "emoji": true
                                        },
                                        "value": "Movies"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Basketball",
                                            "emoji": true
                                        },
                                        "value": "Basketball"
                                    }
                                ],
                                "action_id": "selectHobby"
                            }
                        }
                    ]
                });
                response.mood = body.actions[0].selected_option.value;
            }

        } catch (e) {
            console.log(e);
        }

    });

slack.action('selectHobby',
    async ({ ack, body, say }) => {
        try {
            await ack();

            if (response.command !== undefined && response.command.length > 0) {
                Array.from(body.actions[0].selected_options).forEach(val => {
                    response.hobbies.push(val.value);
                });

                response.username = body.user.username
                response.teamId = body.team.id;
                response.appId = body.api_app_id;
                response.date = Date.now();

                await collection["hello-response"].insertOne(response);
                await say("Thank you");
                response = Object.create(model);
            }
        } catch (e) {
            console.log(e);
        }

    });

// Slack command /bot end ___________________________________________

// api section -------------------------------------------------------
app.get("/hello-repsonse",
    async (req, res) => {
        try {
            var data = await collection["hello-response"].find().toArray();
            res.send(data)
        } catch (e) {
            console.log(e);
        }

    })

app.get("/",
    (req, res) => {
        res.send("welcome but nothing here to see")
    })

const run = async () => {
    try {
        let client = await mongoClient.connect();

        let port = parseInt(process.env.PORT) || 3000;

        let db = client.db('slackBot');

        collection = {
            "hello-response": db.collection("hello-response")
        }

        console.log("Database 🔌");

        app.listen(port,
            () => {
                console.log(`Express 👌 on port ${port}`);
            });

        await slack.start(port)
        console.log(`Bolt ⚡ on port ${port}`);

        return app;

    } catch (e) {
        console.log(e);
    }

};

run();

module.exports = run;