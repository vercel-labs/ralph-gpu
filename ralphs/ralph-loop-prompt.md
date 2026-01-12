Implement the feature the user is requesting by creating a ralph-loop script.

Read the readme located in `packages/raplh` to understand how to use the ralph loop agent.

Create a folder inside the `ralphs` folder with a ts script that will run the ralph loop. Take a look at other examples from this folder.

Do not create the .brain folders or the .progress.md file yourself, instruct the LLM to create them if they are not there, provide the templates on the initial context.

Create a detailed description and aceptance criteria for the task you want to solve. Add checks using typescript functions on the script.

Only enable traces and debug if the user requests it.

Copy the .env file from another ralph script so you can access the api keys

Run this script on a background terminal and use sleep command to check its progress from time to time. (at first do 60 seconds, then do 3 minutes per check but do check untill the end)
