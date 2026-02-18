import { TodoistApi, TodoistRequestError } from "@doist/todoist-api-typescript"
import { App} from 'obsidian';
import UltimateTodoistSyncForObsidian from "../main";
import { createObsidianFetchAdapter } from "./obsidianFetchAdapter";
    //convert date from obsidian event
    // 使用示例
    //const str = "2023-03-27";
    //const utcStr = localDateStringToUTCDatetimeString(str);
    //console.log(dateStr); // 输出 2023-03-27T00:00:00.000Z
function  localDateStringToUTCDatetimeString(localDateString:string) {
        try {
          if(localDateString === null || localDateString === undefined){
            return undefined
          }
          localDateString = localDateString + "T08:00";
          let localDateObj = new Date(localDateString);
          let ISOString = localDateObj.toISOString()
          return(ISOString);
        } catch (error) {
          console.error(`Error extracting date from string '${localDateString}': ${error}`);
          return undefined;
        }
}

export class TodoistRestAPI  {
	app:App;
  plugin: UltimateTodoistSyncForObsidian;

	constructor(app:App, plugin:UltimateTodoistSyncForObsidian) {
		//super(app,settings);
		this.app = app;
    this.plugin = plugin;
	}


    initializeAPI(){
        const token = this.plugin.settings.todoistAPIToken
        const api = new TodoistApi(token, {
            customFetch: createObsidianFetchAdapter(),
        })
        return(api)
    }

    async AddTask({ projectId, content, parentId, dueDate, dueDatetime, labels, description, priority }: { projectId: string, content: string, parentId?: string | null, dueDate?: string, dueDatetime?: string, labels?: Array<string>, description?: string, priority?: number }) {
        const api = await this.initializeAPI()
        try {
          // Build the args object, only including defined/non-null properties.
          // v6 API rejects null values; omit fields instead.
          // v6 uses RequireOneOrNone for dueDate/dueDatetime, so only one can be set.
          const args: Record<string, unknown> = { content };

          if (projectId) args.projectId = projectId;
          if (parentId) args.parentId = parentId;
          if (labels && labels.length > 0) args.labels = labels;
          if (description) args.description = description;
          if (priority !== undefined && priority !== null) args.priority = priority;

          if (dueDate) {
            // Convert dueDate to dueDatetime; do NOT pass both
            const converted = localDateStringToUTCDatetimeString(dueDate);
            if (converted) {
              args.dueDatetime = converted;
            }
          } else if (dueDatetime) {
            args.dueDatetime = dueDatetime;
          }

          const newTask = await api.addTask(args as Parameters<typeof api.addTask>[0]);
          return newTask;
        } catch (error) {
          throw new Error(`Error adding task: ${error.message}`);
        }
    }


    //options:{ projectId?: string, section_id?: string, label?: string , filter?: string,lang?: string, ids?: Array<string>}
    async GetActiveTasks(options:{ projectId?: string, section_id?: string, label?: string , filter?: string, lang?: string, ids?: Array<string>}) {
      const api = await this.initializeAPI()
      try {
        // v6 returns { results, nextCursor }; paginate to collect all tasks
        const allTasks: Awaited<ReturnType<typeof api.getTask>>[] = [];
        let cursor: string | null | undefined = undefined;

        do {
          const args: Record<string, unknown> = { ...options };
          if (cursor) {
            args.cursor = cursor;
          }
          const response = await api.getTasks(args as Parameters<typeof api.getTasks>[0]);
          allTasks.push(...response.results);
          cursor = response.nextCursor;
        } while (cursor);

        return allTasks;
      } catch (error) {
        throw new Error(`Error get active tasks: ${error.message}`);
      }
    }


    //Also note that to remove the due date of a task completely, you should set the due_string parameter to no date or no due date.
    //api 没有 update task project id 的函数
    async UpdateTask(taskId: string, updates: { content?: string, description?: string, labels?:Array<string>,dueDate?: string,dueDatetime?: string,dueString?:string,parentId?:string,priority?:number }) {
        const api = await this.initializeAPI()
        if (!taskId) {
        throw new Error('taskId is required');
        }
        if (!updates.content && !updates.description &&!updates.dueDate && !updates.dueDatetime && !updates.dueString && !updates.labels &&!updates.parentId && !updates.priority) {
        throw new Error('At least one update is required');
        }
        try {
        // Build args object, only including defined properties.
        // v6 uses RequireOneOrNone for dueDate/dueDatetime.
        const args: Record<string, unknown> = {};

        if (updates.content !== undefined) args.content = updates.content;
        if (updates.description !== undefined) args.description = updates.description;
        if (updates.labels !== undefined) args.labels = updates.labels;
        if (updates.dueString !== undefined) args.dueString = updates.dueString;
        if (updates.priority !== undefined) args.priority = updates.priority;

        if (updates.dueDate) {
            console.log(updates.dueDate)
            const converted = localDateStringToUTCDatetimeString(updates.dueDate);
            if (converted) {
              args.dueDatetime = converted;
            }
            console.log(args.dueDatetime)
        } else if (updates.dueDatetime) {
            args.dueDatetime = updates.dueDatetime;
        }

        const updatedTask = await api.updateTask(taskId, args as Parameters<typeof api.updateTask>[1]);
        return updatedTask;
        } catch (error) {
        throw new Error(`Error updating task: ${error.message}`);
        }
    }




    //open a task
    async OpenTask(taskId:string) {
        const api = await this.initializeAPI()
        try {

        const isSuccess = await api.reopenTask(taskId);
        console.log(`Task ${taskId} is reopend`)
        return(isSuccess)

        } catch (error) {
            console.error('Error open a  task:', error);
            return
        }
    }

    // Close a task in Todoist API
    async CloseTask(taskId: string): Promise<boolean> {
        const api = await this.initializeAPI()
        try {
        const isSuccess = await api.closeTask(taskId);
        console.log(`Task ${taskId} is closed`)
        return isSuccess;
        } catch (error) {
        console.error('Error closing task:', error);
        throw error; // 抛出错误使调用方能够捕获并处理它
        }
    }




    // get a task by Id
    async getTaskById(taskId: string) {
        const api = await this.initializeAPI()
        if (!taskId) {
        throw new Error('taskId is required');
        }
        try {
        const task = await api.getTask(taskId);
        return task;
        } catch (error) {
          // v6 throws TodoistRequestError with httpStatusCode
          if (error instanceof TodoistRequestError && error.httpStatusCode) {
            const statusCode = error.httpStatusCode;
            throw new Error(`Error retrieving task. Status code: ${statusCode}`);
          } else {
            throw new Error(`Error retrieving task: ${error.message}`);
          }
        }
    }

    //get a task due by id
    async getTaskDueById(taskId: string) {
        const api = await this.initializeAPI()
        if (!taskId) {
        throw new Error('taskId is required');
        }
        try {
        const task = await api.getTask(taskId);
        const due = task.due ?? null
        return due;
        } catch (error) {
        throw new Error(`Error updating task: ${error.message}`);
        }
    }


    //get all projects
    async GetAllProjects() {
        const api = await this.initializeAPI()
        try {
        // v6 returns { results, nextCursor }; paginate to collect all projects
        const allProjects: Awaited<ReturnType<typeof api.getProject>>[] = [];
        let cursor: string | null | undefined = undefined;

        do {
          const args: Record<string, unknown> = {};
          if (cursor) {
            args.cursor = cursor;
          }
          const response = await api.getProjects(args as Parameters<typeof api.getProjects>[0]);
          allProjects.push(...response.results);
          cursor = response.nextCursor;
        } while (cursor);

        return allProjects;

        } catch (error) {
            console.error('Error get all projects', error);
            return false
        }
    }


}
