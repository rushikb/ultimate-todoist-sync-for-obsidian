import { App} from 'obsidian';
import UltimateTodoistSyncForObsidian from "../main";
import { time } from 'console';
export class FileOperation   {
	app:App;
    plugin: UltimateTodoistSyncForObsidian;


	constructor(app:App, plugin:UltimateTodoistSyncForObsidian) {
		//super(app,settings);
		this.app = app;
        this.plugin = plugin;

	}
    /*
    async getFrontMatter(file:TFile): Promise<FrontMatter | null> {
        return new Promise((resolve) => {
          this.app.fileManager.processFrontMatter(file, (frontMatter) => {
            resolve(frontMatter);
          });
        });
    }
    */
    



    /*
    async updateFrontMatter(
    file:TFile,
    updater: (frontMatter: FrontMatter) => void
    ): Promise<void> {
        //console.log(`prepare to update front matter`)
        this.app.fileManager.processFrontMatter(file, (frontMatter) => {
        if (frontMatter !== null) {
        const updatedFrontMatter = { ...frontMatter } as FrontMatter;
        updater(updatedFrontMatter);
        this.app.fileManager.processFrontMatter(file, (newFrontMatter) => {
            if (newFrontMatter !== null) {
            newFrontMatter.todoistTasks = updatedFrontMatter.todoistTasks;
            newFrontMatter.todoistCount = updatedFrontMatter.todoistCount;
            }
        });
        }
    });
    }
    */


    
          

     // 完成一个任务，将其标记为已完成
    async completeTaskInTheFile(taskId: string) {
        // 获取任务文件路径
        console.log("taskid", taskId)
        let currentTask
        try{
            currentTask = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskId)
        }catch(error){
            throw new Error(`Failed to get task cache while completing task ${taskId}`,error)
        }
        
        if (currentTask == undefined) {
            throw new Error(`Failed to complete task ${taskId} in file, task is not pesented in the cache`)
            return 
            const filepath = await this.searchFilepathsByTaskidInVault(taskId)
            if (filepath == null) {
                console.log(`Task ${taskId} not found in vault`)
                return
            }
            const metadata = await this.plugin.cacheOperation.getFileMetadata(filepath)
            if(!metadata){
                await this.plugin.cacheOperation.newEmptyFileMetadata(filepath)
            }
            const taskObject = await this.plugin.todoistRestAPI.getTaskById(taskId);
            taskObject.path = filepath
            this.plugin.cacheOperation.appendTaskToCache(taskObject)
            currentTask = taskObject
        }
        const filepath = currentTask.path
    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        if(file == null) {
            console.log("Error with filepath: " + filepath)
            return
        }
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes(taskId) && this.plugin.taskParser.hasTodoistTag(line)) {
            lines[i] = line.replace('[ ]', '[x]')
            console.warn(`${taskId} has completed in file ${filepath}, at line ${line}`)
            modified = true
            break
        }
        }
    
        if (modified) {
        const newContent = lines.join('\n')
        await this.app.vault.modify(file, newContent)
        }
    }
  
    // uncheck 已完成的任务，
    async uncompleteTaskInTheFile(taskId: string) {
        // 获取任务文件路径
        let currentTask
        try{
            currentTask = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskId)
        }catch(error){
            throw new Error(`Failed to get task cache while unchecking task ${taskId}`,error)
        }
        if (currentTask == undefined) {
            throw new Error(`Failed to unchecked task ${taskId} in file, task is not pesented in the cache`)
            return
            const filepath = await this.searchFilepathsByTaskidInVault(taskId)
            if (filepath == null) {
                console.log(`Task ${taskId} not found in vault`)
                return
            }
            const metadata = await this.plugin.cacheOperation.getFileMetadata(filepath)
            if(!metadata){
                await this.plugin.cacheOperation.newEmptyFileMetadata(filepath)
            }
            const taskObject = await this.plugin.todoistRestAPI.getTaskById(taskId);
            taskObject.path = filepath
            this.plugin.cacheOperation.appendTaskToCache(taskObject)
            currentTask = taskObject
        }
        const filepath = currentTask.path

        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes(taskId) && this.plugin.taskParser.hasTodoistTag(line)) {
            lines[i] = line.replace(/- \[(x|X)\]/g, '- [ ]');
            console.warn(`${taskId} has unchecked in file ${filepath}, at line ${line}`)
            modified = true
            break
        }
        }
    
        if (modified) {
        const newContent = lines.join('\n')
        await this.app.vault.modify(file, newContent)
        }
    }

    //add #todoist at the end of task line, if full vault sync enabled
    async addTodoistTagToFile(filepath: string) {    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if(!this.plugin.taskParser.isMarkdownTask(line)){
                //console.log(line)
                //console.log("It is not a markdown task.")
                continue;
            }
            //if content is empty
            if(this.plugin.taskParser.getTaskContentFromLineText(line) == ""){
                //console.log("Line content is empty")
                continue;
            }
            if (!this.plugin.taskParser.hasTodoistId(line) && !this.plugin.taskParser.hasTodoistTag(line)) {
                //console.log(line)
                //console.log('prepare to add todoist tag')
                const newLine = this.plugin.taskParser.addTodoistTag(line);
                console.warn(`Todost tag has added to ${taskId} in file ${filepath}, at line ${line}`)
                //console.log(newLine)
                lines[i] = newLine
                modified = true
            }
        }
        
        if (modified) {
            console.log(`New task found in files ${filepath}`)
            const newContent = lines.join('\n')
            //console.log(newContent)
            await this.app.vault.modify(file, newContent)

            //update filemetadate
            const metadata = await this.plugin.cacheOperation.getFileMetadata(filepath)
            if(!metadata){
                await this.plugin.cacheOperation.newEmptyFileMetadata(filepath)
            }

        }
    }



    //add todoist at the line
    async addTodoistLinkToFile(filepath: string) {    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (this.plugin.taskParser.hasTodoistId(line) && this.plugin.taskParser.hasTodoistTag(line)) {
                if(this.plugin.taskParser.hasTodoistLink(line)){
                    continue
                }
                console.log(line)
                //console.log('prepare to add todoist link')
                const taskID = this.plugin.taskParser.getTodoistIdFromLineText(line)
                let taskObject = null
                try{
                    taskObject = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskID)
                }catch(error){
                    throw new Error(`Failed to get task cache while adding todoist link to file task ${taskID}`,error)
                }
                if(!taskObject){
                    let obsidianUrl = this.plugin.taskParser.getObsidianUrlFromFilepath(filepath)
                    console.error(`An error occurred while add task ${taskID}'s todoist link to the file ${filepath}. \n ${obsidianUrl}`);
                    continue
                }
                const todoistLink = taskObject.url
                const link = `[${this.plugin.settings.todoistLinkString}]](${todoistLink})`
                const newLine = this.plugin.taskParser.addTodoistLink(line,link)
                console.log(newLine)
                lines[i] = newLine
                console.warn(`Todoist link has added to task ${taskId} in file ${filepath}, at line ${line}`)
                modified = true
            }else{
                continue
            }
        }
        
        if (modified) {
            const newContent = lines.join('\n')
            //console.log(newContent)
            await this.app.vault.modify(file, newContent)



        }
    }


        //add #todoist at the end of task line, if full vault sync enabled
    async addTodoistTagToLine(filepath:string,lineText:string,lineNumber:number,fileContent:string) {    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = fileContent
    
        const lines = content.split('\n')
        let modified = false
    
        
        const line = lineText
        if(!this.plugin.taskParser.isMarkdownTask(line)){
            //console.log(line)
            //console.log("It is not a markdown task.")
            return;
        }
        //if content is empty
        if(this.plugin.taskParser.getTaskContentFromLineText(line) == ""){
            //console.log("Line content is empty")
            return;
        }
        if (!this.plugin.taskParser.hasTodoistId(line) && !this.plugin.taskParser.hasTodoistTag(line)) {
            //console.log(line)
            //console.log('prepare to add todoist tag')
            const newLine = this.plugin.taskParser.addTodoistTag(line);
            //console.log(newLine)
            lines[lineNumber] = newLine
            console.warn(`Todoist tag has added to task ${taskId} in file ${filepath}, at line ${line}`)
            modified = true
        }
        
        
        if (modified) {
            console.log(`New task found in files ${filepath}`)
            const newContent = lines.join('\n')
            console.log(newContent)
            await this.app.vault.modify(file, newContent)

            //update filemetadate
            const metadata = await this.plugin.cacheOperation.getFileMetadata(filepath)
            if(!metadata){
                await this.plugin.cacheOperation.newEmptyFileMetadata(filepath)
            }

        }
    }

    // sync updated task content  to file
    // Returns the filepath of the updated file
    async updateTaskContentInFile(taskId, filepath, taskContent): Promise<string> {


        let currentTask
        try{
            currentTask = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskId)
        }catch(error){
            throw new Error(`Failed to get task cache while updating task ${taskId} content in file, filepath: ${filepath}, task content: ${taskContent}`,error)
        }
		if (currentTask == undefined) {
            throw new Error(`Failed to update task ${taskId} content in file, task is not pesented in the cache`)
            return
			
			if (filepath == null) {
				console.error(`Task ${taskId} was not found in the vault`)
				return ""
			}
			const metadata = await this.plugin.cacheOperation.getFileMetadata(filepath)
			if(!metadata){
				await this.plugin.cacheOperation.newEmptyFileMetadata(filepath)
			}
			const taskObject = await this.plugin.todoistRestAPI.getTaskById(taskId);
			taskObject.path = filepath
			this.plugin.cacheOperation.appendTaskToCache(taskObject)
			currentTask = taskObject
		}
		

        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        if (file == null) {
            console.log("Error with filepath: " + filepath)
            return filepath
        }
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			if (line.includes(taskId) && this.plugin.taskParser.hasTodoistTag(line)) {
				const oldTaskContent = this.plugin.taskParser.getTaskContentFromLineText(line)
				const newTaskContent = taskContent

                if(newTaskContent === oldTaskContent){
                    throw new Error(`An error occured while updating task content in file ${filepath}, at line ${line}, task content was not changed! newContent:${newTaskContent}`)
                }
				let newline = line.replace(oldTaskContent, newTaskContent)
                console.warn(`Update task content in file ${filepath}, at line ${line}`)
                console.warn(`old content: ${oldTaskContent}, new content ${newTaskContent}`)
				lines[i] = newline
				modified = true
				break
			}
		}

        if (modified) {
        const newContent = lines.join('\n')
        
        await this.app.vault.modify(file, newContent)
        }
        return filepath
        
    }

    // sync updated task due date  to the file
    async updateTaskDueDateInFile(taskId, filepath, dueDate, timezone) {



        // 获取任务文件路径
        let currentTask
        try{
            currentTask = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskId)
        }catch(error){
            throw new Error(`Failed to get task cache while updating task ${taskId} due date. filepath: ${filepath}`,error)
        }
        
    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes(taskId) && this.plugin.taskParser.hasTodoistTag(line)) {

           


            const oldTaskDueDate = this.plugin.taskParser.getDueDateFromLineText(line) || ""
            const oldTaskTimeZone = this.plugin.taskParser?.getLocalSystemTimezone()
            const newTaskDueDate = dueDate 
            const newTaskTimezone = timezone

            const isDueDateChanged = this.plugin.taskParser?.compareTaskDueDate(oldTaskDueDate,oldTaskTimeZone,newTaskDueDate,newTaskTimezone)
            if(!isDueDateChanged){
                throw new Error(`An error occured while update task ${taskId}duedate in ${filepath}. duedate was not changed.\n oldtaskduedate: ${oldTaskDueDate}\n newTaskDue: ${newTaskDueDate}\n newTaskTimezone: ${newTaskTimezone}`)
            }

            //console.log(`${taskId} duedate is updated`)
            if(oldTaskDueDate === ""){
                //console.log(this.plugin.taskParser.insertDueDateBeforeTodoist(line,newTaskDueDate))
                lines[i] = this.plugin.taskParser.insertDueDateBeforeTodoist(line,newTaskDueDate)
                console.warn(`Update task due date in file ${filepath}, at line ${line}`)
                console.warn(`old duedate: ${oldTaskDueDate}, new duedate ${newTaskDueDate}`)
                modified = true

            }
            else if(newTaskDueDate === ""){
                //remove 日期from text
                const regexRemoveDate = /(🗓️|📅|📆|🗓)\s?\d{4}-\d{2}-\d{2}/; //匹配日期🗓️2023-03-07"
                lines[i] = line.replace(regexRemoveDate,"")
                console.warn(`Update task due date in file ${filepath}, at line ${line}`)
                console.warn(`old duedate: ${oldTaskDueDate}, new duedate ${newTaskDueDate}`)
                modified = true
            }
            else{

                lines[i] = line.replace(oldTaskDueDate, newTaskDueDate)
                console.warn(`Update task due date in file ${filepath}, at line ${line}`)
                console.warn(`old duedate: ${oldTaskDueDate}, new duedate ${newTaskDueDate}`)
                modified = true
            }
            break
        }
        }
    
        if (modified) {
        const newContent = lines.join('\n')
        //console.log(newContent)
        await this.app.vault.modify(file, newContent)
        }
        
    }



    // sync new task note to file
    async syncTaskNoteToFile(taskId,filepath,note,eventDate) {



        // 获取任务文件路径
        let currentTask
        try{
            currentTask = await this.plugin.cacheOperation.loadTaskFromCacheByID(taskId)
        }catch(error){
            throw new Error(`Failed to get task cache while sync task ${taskId} note from todoist to obsidian. filepath: ${filepath} ,note: ${note}`,error)
        }
       
    
        // 获取文件对象并更新内容
        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        let modified = false
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.includes(taskId) && this.plugin.taskParser.hasTodoistTag(line)) {
                const indent = '\t'.repeat(line.length - line.trimStart().length + 1);
                const noteLine = `${indent}- ${eventDate} ${note}`;
                lines.splice(i + 1, 0, noteLine);
                console.warn(`Task note of ${taskId }added in file ${filepath}, at line ${line}`)
                console.warn(`Task note: ${note}`)
                modified = true
                break
            }
        }
    
        if (modified) {
        const newContent = lines.join('\n')
        //console.log(newContent)
        await this.app.vault.modify(file, newContent)
        }
        
    }


    //避免使用该方式，通过view可以获得实时更新的value
    async readContentFromFilePath(filepath:string){
        try {
            const file = this.app.vault.getAbstractFileByPath(filepath);
            const content = await this.app.vault.read(file);
            return content
        } catch (error) {
            console.error(`Error loading content from ${filepath}: ${error}`);
            return false;
        }
    }

    //get line text from file path
    //请使用 view.editor.getLine，read 方法有延迟
    async getLineTextFromFilePath(filepath:string,lineNumber:string) {

        const file = this.app.vault.getAbstractFileByPath(filepath)
        const content = await this.app.vault.read(file)
    
        const lines = content.split('\n')
        return(lines[lineNumber])
    }
  
    // Function to search for a Todoist task by id from a specified file path
    async searchTaskFromFilePath(filepath: string, searchTerm: string): Promise<string | null> {
        // 检查输入参数是否有效
        if (!filepath || !searchTerm) {
            console.error("Invalid filepath or searchTerm. Please provide valid arguments.");
            return null;
        }

        try {
            // 获取文件引用
            const file = this.app.vault.getAbstractFileByPath(filepath);
            
            if (!file) {
                console.error(`File not found at path: ${filepath}`);
                return null;
            }

            // 读取文件内容
            const fileContent = await this.app.vault.read(file);
            if (!fileContent) {
                console.error(`Failed to read content from file at path: ${filepath}`);
                return null;
            }

            // 分割文件内容为行
            const fileLines = fileContent.split('\n');
            let resultline: string | null = null;

            //todo use fileContent.contain()
            // 遍历每一行，查找包含 searchTerm 的行
            for (const line of fileLines) {
                // 如果当前行包含 searchTerm，则尝试提取 todoist_id
                if (line.includes(searchTerm)) {
                    // 使用正则表达式提取 [todoist_id:: value]
                    resultline = line
                    break; // 找到目标后停止循环
                }
            }

            // 返回找到的 todoist_id，如果没有找到则返回 null
            return resultline;

        } catch (error) {
            // 处理所有可能的异常
            console.error(`An error occurred while searching for Todoist ID in file at path: ${filepath}.`, error);
            return null;
        }
    }


    async replaceContentInVault(oldstring: string, newString: string) {
        const files = await this.getAllFilesInTheVault();
    
        // 创建任务列表
        const tasks = files.map(async (file) => {
            // 调用替换函数，并返回成功替换的文件路径
            if (!this.isMarkdownFile(file.path)) {
                return;
            }
            const result = await this.replaceContentInFile(file.path, oldstring, newString);
            return result ? file.path : undefined;
        });
    
        // 等待所有任务完成，并筛选出成功替换的文件路径
        const results = await Promise.all(tasks);
        const filePaths = results.filter((filePath) => filePath !== undefined);
        return filePaths.length > 0 ? filePaths : null;
    }
    
    async replaceContentInFile(filepath: string, oldstring: string, newString: string) {
        try {
            // 获取文件对象
            const file = this.app.vault.getAbstractFileByPath(filepath);
    
            // 检查文件是否存在
            if (!file) {
                console.error(`File not found: ${filepath}`);
                return false;
            }
    
            // 读取文件内容
            const fileContent = await this.app.vault.read(file);
            console.log("Original file content:", fileContent);
    
            // 检查文件内容是否包含 oldstring，并打印包含的调试信息
            if (fileContent.includes(oldstring)) {
                console.log(`Found the target string "${oldstring}" in the file content.`);
    
                // 转义旧字符串中的特殊字符
                const escapedOldString = oldstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                console.log("Escaped Old String for RegExp:", escapedOldString);
    
                // 使用正则表达式进行替换，确保全局替换所有匹配项
                const updatedContent = fileContent.replace(new RegExp(escapedOldString, 'g'), newString);
                console.log("Updated Content:", updatedContent);
    
                // 如果内容发生了改变，则更新文件内容
                if (fileContent !== updatedContent) {
                    await this.app.vault.modify(file, updatedContent);
                    console.warn(`File content in "${filepath}" has been changed.`);
                    return true;
                } else {
                    console.warn(`No changes made to the file content in "${filepath}".`);
                }
            } else {
                console.warn(`The target string "${oldstring}" was not found in the file content.`);
            }
        } catch (error) {
            console.error(`An error occurred while replacing content in "${filepath}":`, error);
        }
    
        return false;
    }




        // 使用通用的正则表达式替换所有文件内容中的指定部分内容的函数
    async replaceContentInVaultByGenericRegex(contentRegexString: string, matchGroupIndex: number, replacement: string) {
        const files = await this.getAllFilesInTheVault();

        // 创建任务列表
        const tasks = files.map(async (file) => {
            if(!this.isMarkdownFile(file.path)){
                return
            }
            // 调用替换函数，并返回成功替换的文件路径
            const result = await this.replaceContentInFileByGenericRegex(file.path, contentRegexString, matchGroupIndex, replacement);
            return result ? file.path : undefined;
        });

        // 等待所有任务完成，并筛选出成功替换的文件路径
        const results = await Promise.all(tasks);
        const filePaths = results.filter((filePath) => filePath !== undefined);
        return filePaths.length > 0 ? filePaths : null;
    }

    async  replaceContentInFileByGenericRegex(filepath, contentRegexString, matchGroupIndex, replacement) {
        // 获取文件对象
        const file = this.app.vault.getAbstractFileByPath(filepath);
        const fileContent = await this.app.vault.read(file);

        // 创建正则表达式对象
        const regex = new RegExp(contentRegexString, 'g');

        // 使用正则表达式替换指定捕获组的内容
        const updatedContent = fileContent.replace(regex, (match, ...groups) => {
            // groups[matchGroupIndex - 1] 对应正则表达式中的第 matchGroupIndex 个捕获组
            if (groups[matchGroupIndex - 1] !== undefined) {
                // 替换指定捕获组的内容为 replacement
                return match.replace(groups[matchGroupIndex - 1], replacement);
            }
            return match;
        });

        // 如果内容发生了改变，则更新文件内容
        if (fileContent !== updatedContent) {
            await this.app.vault.modify(file, updatedContent);
            return true;
        }
        return false;
    }









    //get all files in the vault
    async getAllFilesInTheVault(){
        const files = this.app.vault.getFiles()
        return(files)
    }

    //search filepath by taskid in vault
    async searchFilepathsByTaskidInVault(taskId:string){
        console.log(`prepare to search task ${taskId}`)
        const files = await this.getAllFilesInTheVault()
        //console.log(files)
        const tasks = files.map(async (file) => {
            if (!this.isMarkdownFile(file.path)) {
                return;
            }
            const fileContent = await this.app.vault.cachedRead(file);
            if (fileContent.includes(taskId)) {
                return file.path;
            }
        });
    
        const results = await Promise.all(tasks);
        const filePaths = results.filter((filePath) => filePath !== undefined);
        return filePaths[0] || null;
        //return filePaths || null
    }


    isMarkdownFile(filename:string) {
        // 获取文件名的扩展名
        let extension = filename.split('.').pop();
      
        // 将扩展名转换为小写（Markdown文件的扩展名通常是.md）
        extension = extension.toLowerCase();
      
        // 判断扩展名是否为.md
        if (extension === 'md') {
          return true;
        } else {
          return false;
        }
      }





}
