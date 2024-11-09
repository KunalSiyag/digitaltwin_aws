'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface DigitalTwin {
  id: string
  name: string
  data: TwinData[]
}

interface TwinData {
  "Sent data": {
    "Type": string
    "Air Temp": number
    "Process Temp": number
    "Rotational Speed": number
    "Torque": number
    "Tool Wear": number
  }
  "API Response": {
    "Health Status": string
  }
  timestamp: number
}

const API_ENDPOINT = "https://ligr2u0axj.execute-api.ap-south-1.amazonaws.com/"

export default function DigitalTwinDashboard() {
  const [twins, setTwins] = useState<DigitalTwin[]>([])
  const [newTwinName, setNewTwinName] = useState('')
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const addDigitalTwin = () => {
    if (newTwinName) {
      const newTwin: DigitalTwin = {
        id: (twins.length + 1).toString(),
        name: newTwinName,
        data: []
      }
      setTwins([...twins, newTwin])
      setNewTwinName('')
    }
  }

  const fetchTwinData = async (twin: DigitalTwin) => {
    setIsLoading(true)
    let retries = 3
    while (retries > 0) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: TwinData = await response.json()
        data.timestamp = Date.now()
        setTwins(prevTwins =>
          prevTwins.map(t =>
            t.id === twin.id
              ? { ...t, data: [...t.data.slice(-19), data] }
              : t
          )
        )
        setIsLoading(false)
        setErrorMessage(null)
        return
      } catch (error) {
        console.error('Error fetching twin data:', error)
        retries -= 1
        if (retries === 0) {
          setIsLoading(false)
          setErrorMessage('Failed to fetch data after multiple attempts. Please try again later.')
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retrying
        }
      }
    }
  }

  useEffect(() => {
    // Fetch data for all twins every 5 seconds
    const interval = setInterval(() => {
      twins.forEach(twin => fetchTwinData(twin))
    }, 5000)

    return () => clearInterval(interval)
  }, [twins])

  const kelvinToCelsius = (kelvin: number) => {
    return (kelvin - 273.15).toFixed(2)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Digital Twin Dashboard</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Digital Twin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Digital Twin</DialogTitle>
              <DialogDescription>
                Enter the name for the new digital twin. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newTwinName}
                  onChange={(e) => setNewTwinName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addDigitalTwin}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {twins.map((twin) => (
          <Card key={twin.id} className="cursor-pointer" onClick={() => setSelectedTwin(twin)}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {twin.name}
                {twin.data.length > 0 && (
                  twin.data[twin.data.length - 1]["API Response"]["Health Status"] === "No Failure" 
                    ? <CheckCircle className="text-green-500" />
                    : <AlertTriangle className="text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {twin.data.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={twin.data.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value: any, name: string) => [Number(value).toFixed(2), name]}
                        />
                      <Line type="monotone" dataKey="Sent data.Air Temp" stroke="#8884d8" dot={false} />
                      <Line type="monotone" dataKey="Sent data.Process Temp" stroke="#82ca9d" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {selectedTwin && (
        <Dialog open={!!selectedTwin} onOpenChange={() => setSelectedTwin(null)}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>{selectedTwin.name} Details</DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
                <Skeleton className="h-4 w-[250px]" />
              </div>
            ) : selectedTwin.data.length > 0 ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Latest Sensor Data:</h3>
                    <p>Type: {selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Type"]}</p>
                    <p>Air Temperature: {kelvinToCelsius(selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Air Temp"])}°C</p>
                    <p>Process Temperature: {kelvinToCelsius(selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Process Temp"])}°C</p>
                    <p>Rotational Speed: {selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Rotational Speed"].toFixed(2)} RPM</p>
                    <p>Torque: {selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Torque"].toFixed(2)} Nm</p>
                    <p>Tool Wear: {selectedTwin.data[selectedTwin.data.length - 1]["Sent data"]["Tool Wear"].toFixed(2)} min</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Health Status:</h3>
                    <p className={selectedTwin.data[selectedTwin.data.length - 1]["API Response"]["Health Status"] === "No Failure" ? "text-green-600" : "text-red-600"}>
                      {selectedTwin.data[selectedTwin.data.length - 1]["API Response"]["Health Status"]}
                    </p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedTwin.data.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        formatter={(value: any, name: string) => [Number(value).toFixed(2), name]}
                        />
                      <Line yAxisId="left" type="monotone" dataKey="Sent data.Air Temp" name="Air Temp" stroke="#8884d8" />
                      <Line yAxisId="left" type="monotone" dataKey="Sent data.Process Temp" name="Process Temp" stroke="#82ca9d" />
                      <Line yAxisId="right" type="monotone" dataKey="Sent data.Rotational Speed" name="Rotational Speed" stroke="#ffc658" />
                      <Line yAxisId="right" type="monotone" dataKey="Sent data.Torque" name="Torque" stroke="#ff7300" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              errorMessage ? (
                <p className="text-red-600">{errorMessage}</p>
              ) : (
                <p>No data available. Please wait for the next update.</p>
              )
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}